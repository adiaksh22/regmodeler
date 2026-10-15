-- Keep public browsing bounded: the browser receives one page, not an entire FAA family catalog.
create index if not exists related_document_matches_model_active_idx
  on public.related_document_matches(model,is_active,version_id);

create function public.search_related_documents(
  p_model text,
  p_type text,
  p_include_history boolean default false,
  p_query text default '',
  p_offset integer default 0,
  p_limit integer default 24
) returns table(
  id uuid, model text, document_type text, document_number text, title text, status text,
  is_active boolean, source_url text, retrieved_at timestamptz, effective_date text,
  holder text, summary text, candidate_reason text, supersedes jsonb, superseded_by jsonb,
  original_archived boolean, attachments_pending boolean, total_count bigint
) language sql stable security invoker set search_path=pg_catalog,public as $$
  with filtered as (
    select d.id,d.model,d.document_type,d.document_number,d.title,d.status,d.is_active,d.source_url,d.retrieved_at,
      d.effective_date,d.holder,d.summary,d.candidate_reason,d.supersedes,d.superseded_by,d.original_archived,d.attachments_pending
    from public.related_documents d
    where d.model=p_model and d.document_type=p_type
      and (p_include_history or (d.is_active and d.status='current'))
      and (length(trim(p_query))=0 or position(lower(trim(p_query)) in lower(
        d.document_number||' '||d.title||' '||coalesce(d.holder,'')
      ))>0)
  )
  select f.*,count(*) over() from filtered f
  order by (f.is_active and f.status='current') desc,f.document_number collate "C",f.retrieved_at desc,f.id
  offset greatest(p_offset,0) limit least(greatest(p_limit,1),50)
$$;
revoke all on function public.search_related_documents(text,text,boolean,text,integer,integer) from public;
grant execute on function public.search_related_documents(text,text,boolean,text,integer,integer) to anon,authenticated,service_role;

-- A no-change check advances freshness without mutating catalog rows or source observations.
create function public.record_source_check(p_source text,p_observed_modified_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare run_id uuid;
begin
  if not exists(select 1 from public.ingestion_checkpoints where source=p_source) then raise exception 'Baseline required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_source,0));
  insert into public.ingestion_runs(source,status,completed_at,records_processed)
    values(p_source,'succeeded',now(),0) returning id into run_id;
  update public.ingestion_checkpoints set last_successful_run_id=run_id,
    source_modified_at=greatest(source_modified_at,p_observed_modified_at),updated_at=now()
    where source=p_source;
  return run_id;
end $$;
revoke all on function public.record_source_check(text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_source_check(text,timestamptz) to service_role;

