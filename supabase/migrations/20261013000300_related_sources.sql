create table public.related_document_matches (
  source text not null,
  version_id uuid not null references public.document_versions(id),
  model text not null check(model in('PA-28-140','PA-28-181')),
  is_active boolean not null default true,
  primary key(source,version_id,model)
);
alter table public.related_document_matches enable row level security;
revoke all on public.related_document_matches from anon,authenticated;
grant select on public.related_document_matches to anon,authenticated;
grant all on public.related_document_matches to service_role;
create policy related_matches_public on public.related_document_matches for select to anon,authenticated using (
  exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id
    where v.id=version_id and v.is_published and d.is_published)
);

create function public.commit_pa28_related(p_run_id uuid,p_type text,p_records jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  source_key text; run_started timestamptz; previous_started timestamptz;
  item jsonb; doc_id uuid; version_id uuid; model_name text; doc_number text; max_modified timestamptz;
begin
  if p_type not in('AD','STC','CAR') then raise exception 'Unsupported type'; end if;
  source_key:='FAA:'||case p_type when 'AD' then 'ADFRAWD' else p_type end||':PA28';
  perform pg_advisory_xact_lock(hashtextextended(source_key,0));
  select started_at into run_started from public.ingestion_runs where id=p_run_id and source=source_key and status='running' for update;
  if run_started is null then raise exception 'Invalid run'; end if;
  select r.started_at into previous_started from public.ingestion_checkpoints c join public.ingestion_runs r on r.id=c.last_successful_run_id where c.source=source_key;
  if previous_started>run_started then raise exception 'Stale run'; end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)=0 then raise exception 'Empty batch'; end if;
  update public.related_document_matches set is_active=false where source=source_key;
  for item in select value from jsonb_array_elements(p_records) loop
    if item->>'source_url' is null or item->>'source_url' !~ '^https://drs\.faa\.gov/browse/excelExternalWindow/[A-Za-z0-9._-]+$' or
      item->'metadata'->>'metadata_sha256' is null or item->'metadata'->>'metadata_sha256' !~ '^[a-f0-9]{64}$' or
      item->'metadata'->>'metadata_storage_path' is distinct from 'FAA/'||p_type||'/PA28/'||(item->'metadata'->>'metadata_sha256')||'.json' or
      item->>'status' is null or jsonb_typeof(item->'models')<>'array' then raise exception 'Invalid source row'; end if;
    insert into public.documents(authority,document_type,document_number,title,is_published)
      values('FAA',p_type,item->>'document_number',item->>'title',true)
      on conflict(authority,document_type,document_number) do update set title=excluded.title returning id into doc_id;
    insert into public.document_versions(document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
      values(doc_id,item->>'source_version_id',item->>'revision_label',(item->>'revision_date')::date,item->>'status',item->>'source_url',(item->>'retrieved_at')::timestamptz,item->'metadata',true)
      on conflict(document_id,source_version_id) do update set source_version_id=excluded.source_version_id returning id into version_id;
    for model_name in select jsonb_array_elements_text(item->'models') loop
      insert into public.related_document_matches(source,version_id,model,is_active) values(source_key,version_id,model_name,true)
        on conflict on constraint related_document_matches_pkey do update set is_active=true;
    end loop;
    max_modified:=greatest(max_modified,(item->'metadata'->>'source_modified_at')::timestamptz);
  end loop;
  for doc_number in select distinct value->>'document_number' from jsonb_array_elements(p_records) loop
    update public.documents d set current_version_id=(
      select v.id from public.document_versions v where v.document_id=d.id and v.source_version_id in
        (select value->>'source_version_id' from jsonb_array_elements(p_records) where value->>'document_number'=doc_number)
      order by case v.status when 'current' then 0 when 'pending' then 1 else 2 end,
        (v.metadata->>'source_modified_at')::timestamptz desc nulls last,v.source_version_id limit 1)
      where d.authority='FAA' and d.document_type=p_type and d.document_number=doc_number;
  end loop;
  update public.ingestion_runs set status='succeeded',completed_at=now(),records_processed=jsonb_array_length(p_records) where id=p_run_id;
  insert into public.ingestion_checkpoints(source,last_successful_run_id,source_modified_at,updated_at) values(source_key,p_run_id,max_modified,now())
    on conflict(source) do update set last_successful_run_id=excluded.last_successful_run_id,source_modified_at=greatest(public.ingestion_checkpoints.source_modified_at,excluded.source_modified_at),updated_at=now();
  return jsonb_array_length(p_records);
end $$;
revoke all on function public.commit_pa28_related(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_pa28_related(uuid,text,jsonb) to service_role;

create view public.related_documents with(security_invoker=true) as
select v.id,m.model,d.document_type,d.document_number,coalesce(v.metadata->>'title',d.title) as title,v.status,m.is_active,v.source_url,v.retrieved_at,
  v.metadata->>'effective_date' as effective_date,v.metadata->>'holder' as holder,v.metadata->>'summary' as summary,
  v.metadata->>'regulatory_text' as regulatory_text,v.metadata->>'candidate_reason' as candidate_reason,
  v.metadata->'supersedes' as supersedes,v.metadata->'superseded_by' as superseded_by,
  (v.content_sha256 is not null) as original_archived,
  coalesce((v.metadata->>'additional_attachments_pending')::boolean,false) as attachments_pending
from public.related_document_matches m join public.document_versions v on v.id=m.version_id join public.documents d on d.id=v.document_id;
grant select on public.related_documents to anon,authenticated,service_role;

create function public.related_last_checked(p_model text) returns table(document_type text,last_checked timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
select case c.source when 'FAA:ADFRAWD:PA28' then 'AD' else 'STC' end,r.completed_at
from public.ingestion_checkpoints c join public.ingestion_runs r on r.id=c.last_successful_run_id
where p_model in('PA-28-140','PA-28-181') and c.source in('FAA:ADFRAWD:PA28','FAA:STC:PA28') and r.status='succeeded'
$$;
revoke all on function public.related_last_checked(text) from public;
grant execute on function public.related_last_checked(text) to anon,authenticated,service_role;

create function public.commit_reference_texts(p_rows jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; doc_id uuid; version_id uuid;
begin
  for item in select value from jsonb_array_elements(p_rows) loop
    if item->>'source_url' is distinct from 'https://www.govinfo.gov/content/pkg/CFR-2016-title14-vol1/xml/CFR-2016-title14-vol1-part23.xml' or
      item->>'source_kind' is distinct from 'later_reference' or item->>'edition_date' is distinct from '2016-01-01' or
      item->>'section' not in('23.207','23.221','23.955','23.959','23.1327','23.1547','23.1557') or
      item->>'content_sha256' is null or item->>'content_sha256' !~ '^[a-f0-9]{64}$' or length(item->>'body_text')=0 then raise exception 'Invalid reference source'; end if;
    insert into public.documents(authority,document_type,document_number,title,is_published)
      values('US','CFR','14 CFR '||(item->>'section'),item->>'title',true)
      on conflict(authority,document_type,document_number) do update set title=excluded.title returning id into doc_id;
    insert into public.document_versions(document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,content_sha256,storage_path,metadata,is_published)
      values(doc_id,'GOVINFO:2016:'||(item->>'section')||'@'||(item->>'content_sha256'),'2016 reference edition','2016-01-01','historical',
        item->>'source_url',(item->>'retrieved_at')::timestamptz,item->>'content_sha256',item->>'storage_path',item,true)
      on conflict(document_id,source_version_id) do update set source_version_id=excluded.source_version_id returning id into version_id;
    update public.documents set current_version_id=version_id where id=doc_id;
  end loop;
  return jsonb_array_length(p_rows);
end $$;
revoke all on function public.commit_reference_texts(jsonb) from public,anon,authenticated;
grant execute on function public.commit_reference_texts(jsonb) to service_role;

create view public.regulation_sources with(security_invoker=true) as
select v.id,v.metadata->>'basis_key' as basis_key,v.metadata->>'section' as section,coalesce(v.metadata->>'source_title',v.metadata->>'title',d.title) as title,
  v.metadata->>'edition_date' as edition_date,v.metadata->>'source_kind' as source_kind,
  v.metadata->>'body_text' as body_text,v.metadata->>'text_quality' as text_quality,v.source_url,v.retrieved_at,
  coalesce((v.metadata->>'contains_graphics')::boolean,false) as contains_graphics
from public.document_versions v join public.documents d on d.id=v.document_id
where d.document_type in('CFR','CAR') and v.metadata->>'source_kind' in('later_reference','exact_historical');
grant select on public.regulation_sources to anon,authenticated,service_role;
