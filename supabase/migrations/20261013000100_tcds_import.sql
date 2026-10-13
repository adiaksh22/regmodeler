-- Commit a fully archived 2A13 batch and its checkpoint in one transaction.
-- Only the importer service role can execute this function.
create function public.commit_pa28_tcds(p_run_id uuid, p_records jsonb)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  item jsonb;
  doc_id uuid;
  version_id uuid;
  current_id uuid;
  source_id text;
  fingerprint text;
  max_modified timestamptz;
  run_started timestamptz;
  previous_started timestamptz;
  processed integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('FAA:TCDSMODEL:2A13', 0));
  select started_at into run_started from public.ingestion_runs
    where id=p_run_id and source='FAA:TCDSMODEL:2A13' and status='running' for update;
  if run_started is null then raise exception 'Invalid import run'; end if;
  select r.started_at into previous_started from public.ingestion_checkpoints c
    join public.ingestion_runs r on r.id=c.last_successful_run_id
    where c.source='FAA:TCDSMODEL:2A13';
  if previous_started is not null and previous_started > run_started then raise exception 'Stale import run'; end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records)=0 then raise exception 'Empty batch'; end if;
  if (select count(*) from jsonb_array_elements(p_records) x where x->>'status'='current') <> 1 then
    raise exception 'Expected one current revision';
  end if;
  insert into public.documents(authority,document_type,document_number,title,is_published)
    values('FAA','TCDS','2A13','TCDS 2A13',true) on conflict(authority,document_type,document_number) do nothing;
  select id into doc_id from public.documents where authority='FAA' and document_type='TCDS' and document_number='2A13';
  for item in select value from jsonb_array_elements(p_records) loop
    source_id := item->>'source_version_id';
    fingerprint := item->'metadata'->>'snapshot_sha256';
    if source_id is null or source_id !~ '^[A-Za-z0-9]+\.[0-9]+$' or fingerprint is null or fingerprint !~ '^[a-f0-9]{64}$' or
      item->>'content_sha256' is null or item->>'content_sha256' !~ '^[a-f0-9]{64}$' or
      item->>'source_url' is null or item->>'storage_path' is null or
      item->'metadata'->>'source_modified_at' is null or
      item->>'source_url' <> 'https://drs.faa.gov/browse/excelExternalWindow/'||source_id or
      item->>'storage_path' <> 'FAA/TCDS/2A13/'||(item->>'content_sha256')||'.pdf' then
      raise exception 'Invalid source snapshot';
    end if;
    version_id := null;
    -- Enrich the already-reviewed seed with original bytes on its first import.
    select id into version_id from public.document_versions
      where document_id=doc_id and source_version_id=source_id and content_sha256 is null;
    if version_id is not null then
      update public.document_versions set content_sha256=item->>'content_sha256',storage_path=item->>'storage_path',
        metadata=item->'metadata',retrieved_at=(item->>'retrieved_at')::timestamptz,
        revision_label=item->>'revision_label',revision_date=(item->>'revision_date')::date,status=item->>'status'
        where id=version_id;
    else
      -- Hash metadata as well as PDF bytes, retaining corrections to the same source GUID.
      if exists(select 1 from public.document_versions where document_id=doc_id and source_version_id=source_id
          and metadata->>'snapshot_sha256'=fingerprint) then
        select id into version_id from public.document_versions where document_id=doc_id and source_version_id=source_id;
        update public.document_versions set status=item->>'status' where id=version_id;
      else
        insert into public.document_versions(document_id,source_version_id,revision_label,revision_date,status,
          source_url,retrieved_at,content_sha256,storage_path,metadata,is_published)
        values(doc_id,source_id||'@'||fingerprint,item->>'revision_label',(item->>'revision_date')::date,item->>'status',
          item->>'source_url',(item->>'retrieved_at')::timestamptz,item->>'content_sha256',item->>'storage_path',item->'metadata',true)
        on conflict(document_id,source_version_id) do update set status=excluded.status
        returning id into version_id;
      end if;
    end if;
    if item->>'status'='current' then current_id := version_id; end if;
    max_modified := greatest(max_modified,(item->'metadata'->>'source_modified_at')::timestamptz);
    processed := processed+1;
  end loop;
  -- Superseded local snapshots remain addressable by their original evidence IDs.
  update public.document_versions set status='historical' where document_id=doc_id and status='current' and id<>current_id;
  update public.documents set current_version_id=current_id where id=doc_id;
  update public.ingestion_runs set status='succeeded',completed_at=now(),records_processed=processed where id=p_run_id;
  insert into public.ingestion_checkpoints(source,last_successful_run_id,source_modified_at,updated_at)
    values('FAA:TCDSMODEL:2A13',p_run_id,max_modified,now()) on conflict(source) do update
    set last_successful_run_id=excluded.last_successful_run_id,
        source_modified_at=greatest(public.ingestion_checkpoints.source_modified_at,excluded.source_modified_at),updated_at=now();
  return processed;
end $$;
revoke all on function public.commit_pa28_tcds(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.commit_pa28_tcds(uuid,jsonb) to service_role;
