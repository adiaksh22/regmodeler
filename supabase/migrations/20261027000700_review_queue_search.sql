-- Resolve historical reviewed model aliases through their stable entity IDs too.
create or replace view public.source_review_queue with(security_invoker=true) as
select v.id as version_id,m.model,d.document_type,d.document_number,coalesce(v.metadata->>'title',d.title) as title,v.source_url,v.retrieved_at,
  v.content_sha256 is not null as original_archived,coalesce((v.metadata->>'additional_attachments_pending')::boolean,false) as attachments_pending,
  case when g.id is not null then 'reviewed' else coalesce(q.decision,'pending') end as review_status,
  case when g.id is not null then 'Reviewed model connection' when history.reviewed then 'Changed source observation; previous relationships need renewed review' when v.content_sha256 is null then 'Primary original has not been archived' else 'Model and configuration evidence needs review' end as review_reason,
  case when g.id is not null then 3 when history.reviewed then 0 when v.content_sha256 is null then 1 else 2 end as priority
from public.related_document_matches m join public.document_versions v on v.id=m.version_id join public.documents d on d.id=v.document_id
left join lateral(select mg.id from public.model_graph mg where mg.evidence_version_id=v.id and mg.model=m.model and mg.path_via is null and mg.relationship_type in('applies_to','approved_for') limit 1) g on true
left join lateral(select exists(select 1 from public.relationships r join public.document_versions old on old.id=r.evidence_version_id join public.aircraft_model_names names on names.entity_id=r.target_entity_id where old.document_id=d.id and old.id<>v.id and names.model=m.model and r.review_status='reviewed') as reviewed) history on true
left join public.source_review_decisions q on q.version_id=v.id and q.model=m.model
where m.is_active and v.status='current' and d.document_type in('AD','STC');

-- One bounded response, including counts even when the selected page is empty.
-- Invoker rights preserve the queue's existing publication and review RLS.
create function public.search_review_queue(
  p_model text, p_status text default 'pending', p_type text default 'all',
  p_query text default '', p_offset integer default 0, p_limit integer default 20
) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  with model_rows as materialized (
    select * from public.source_review_queue where model=p_model
  ), filtered as materialized (
    select * from model_rows
    where (p_status='all' or review_status=p_status)
      and (p_type='all' or document_type=p_type)
      and (coalesce(btrim(p_query),'')='' or
        position(lower(left(btrim(p_query),120)) in lower(document_number||' '||coalesce(title,'')))>0)
  ), page as (
    select * from filtered order by priority,document_type,document_number,version_id
      offset greatest(0,coalesce(p_offset,0)) limit least(50,greatest(1,coalesce(p_limit,20)))
  ) select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(page) order by priority,document_type,document_number,version_id) from page),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'reviewed_count',(select count(*) from model_rows where review_status='reviewed')
  );
$$;
revoke all on function public.search_review_queue(text,text,text,text,integer,integer) from public;
grant execute on function public.search_review_queue(text,text,text,text,integer,integer) to anon,authenticated,service_role;
