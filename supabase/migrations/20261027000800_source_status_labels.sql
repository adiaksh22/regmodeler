-- Expose only curated flag kinds for a published, model-matched source.
-- Findings and private operator notes remain inaccessible as tables.
create function public.source_quality_flags(p_version uuid,p_model text)
returns text[] language sql stable security definer set search_path=pg_catalog,public as $$
  select coalesce(array_agg(f.kind order by f.kind),'{}'::text[])
  from public.source_quality_findings f
  join public.document_versions v on v.id=f.version_id
  join public.documents d on d.id=v.document_id
  where f.version_id=p_version and v.is_published and d.is_published
    and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model=p_model);
$$;
revoke all on function public.source_quality_flags(uuid,text) from public;
grant execute on function public.source_quality_flags(uuid,text) to anon,authenticated,service_role;

-- Preserve the existing RPC for older clients; enrich only its bounded page.
create function public.search_related_documents_with_review(
  p_model text,p_type text,p_include_history boolean default false,p_query text default '',
  p_offset integer default 0,p_limit integer default 24
) returns table(
  id uuid,model text,document_type text,document_number text,title text,status text,
  is_active boolean,source_url text,retrieved_at timestamptz,effective_date text,
  holder text,summary text,candidate_reason text,supersedes jsonb,superseded_by jsonb,
  original_archived boolean,attachments_pending boolean,total_count bigint,
  review_status text,quality_flags text[]
) language sql stable security invoker set search_path=pg_catalog,public as $$
  with page as materialized (
    select * from public.search_related_documents(p_model,p_type,p_include_history,p_query,p_offset,p_limit)
  ) select p.*,coalesce(q.review_status,case when not p.is_active or p.status<>'current' then 'historical' else 'unknown' end),
      public.source_quality_flags(p.id,p_model)
  from page p left join public.source_review_queue q on q.version_id=p.id and q.model=p_model
  order by (p.is_active and p.status='current') desc,p.document_number collate "C",p.retrieved_at desc,p.id;
$$;
revoke all on function public.search_related_documents_with_review(text,text,boolean,text,integer,integer) from public;
grant execute on function public.search_related_documents_with_review(text,text,boolean,text,integer,integer) to anon,authenticated,service_role;

create or replace function public.search_review_queue(
  p_model text,p_status text default 'pending',p_type text default 'all',
  p_query text default '',p_offset integer default 0,p_limit integer default 20
) returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  with model_rows as materialized (
    select * from public.source_review_queue where model=p_model
  ), filtered as materialized (
    select * from model_rows
    where (p_status='all' or review_status=p_status)
      and (p_type='all' or document_type=p_type)
      and (coalesce(btrim(p_query),'')='' or
        position(lower(left(btrim(p_query),120)) in lower(document_number||' '||coalesce(title,'')))>0)
  ), bounded as materialized (
    select * from filtered order by priority,document_type,document_number,version_id
      offset greatest(0,coalesce(p_offset,0)) limit least(50,greatest(1,coalesce(p_limit,20)))
  ), page as (
    select b.*,public.source_quality_flags(b.version_id,p_model) as quality_flags from bounded b
  ) select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(page) order by priority,document_type,document_number,version_id) from page),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'reviewed_count',(select count(*) from model_rows where review_status='reviewed')
  );
$$;
