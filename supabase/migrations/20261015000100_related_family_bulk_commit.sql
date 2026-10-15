-- Keep large family catalogs inside the hosted statement limit with set-based writes.
create function public.record_related_observations_bulk(p_source text,p_run uuid,p_rows jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare baseline boolean;
begin
  select exists(select 1 from public.source_observations where source=p_source) into baseline;
  if baseline then
    with incoming as (
      select row->>'identity' identity,(row->>'version_id')::uuid version_id,row->>'status' status,
        row->>'metadata_hash' metadata_hash,row->>'pdf_hash' pdf_hash,
        array(select jsonb_array_elements_text(row->'models')) models
      from jsonb_array_elements(p_rows) row
    ), compared as (
      select i.*,o.version_id old_version_id,o.status old_status,o.metadata_hash old_metadata_hash,o.pdf_hash old_pdf_hash,o.models old_models,o.active old_active,
        array(select distinct unnest(coalesce(o.models,'{}')||i.models)) event_models,
        array_remove(array[
          case when o.status is distinct from i.status then 'source_status' end,
          case when o.metadata_hash is distinct from i.metadata_hash then 'metadata' end,
          case when o.pdf_hash is distinct from i.pdf_hash then 'original_pdf_bytes' end
        ],null) changed_fields
      from incoming i left join public.source_observations o on o.source=p_source and o.identity=i.identity
    )
    insert into public.source_change_events(source,identity,run_id,kind,old_version_id,new_version_id,models,changed_fields,old_source_status,new_source_status)
    select p_source,identity,p_run,
      case when old_version_id is null then 'discovered' when not old_active then 'returned_to_index' else 'changed' end,
      old_version_id,version_id,event_models,changed_fields,old_status,status
    from compared where cardinality(event_models)>0 and (old_version_id is null or not old_active or cardinality(changed_fields)>0)
    on conflict do nothing;

    with incoming as (select row->>'identity' identity from jsonb_array_elements(p_rows) row)
    insert into public.source_change_events(source,identity,run_id,kind,old_version_id,models,old_source_status)
    select p_source,o.identity,p_run,'missing_from_index',o.version_id,o.models,o.status
    from public.source_observations o where o.source=p_source and o.active and cardinality(o.models)>0
      and not exists(select 1 from incoming i where i.identity=o.identity)
    on conflict do nothing;
  end if;

  update public.source_observations o set active=false,run_id=p_run
  where o.source=p_source and o.active and not exists(
    select 1 from jsonb_array_elements(p_rows) row where row->>'identity'=o.identity
  );

  insert into public.source_observations(source,identity,version_id,status,metadata_hash,pdf_hash,models,active,run_id)
  select p_source,row->>'identity',(row->>'version_id')::uuid,row->>'status',row->>'metadata_hash',row->>'pdf_hash',
    array(select jsonb_array_elements_text(row->'models')),true,p_run from jsonb_array_elements(p_rows) row
  on conflict(source,identity) do update set version_id=excluded.version_id,status=excluded.status,metadata_hash=excluded.metadata_hash,
    pdf_hash=excluded.pdf_hash,models=excluded.models,active=true,run_id=excluded.run_id;
end $$;
revoke all on function public.record_related_observations_bulk(text,uuid,jsonb) from public,anon,authenticated,service_role;

create or replace function public.commit_related_catalog(p_run_id uuid,p_scope text,p_type text,p_records jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  source_key text; archive_name text; run_started timestamptz; previous_started timestamptz;
  max_modified timestamptz; observations jsonb;
begin
  select source,archive_slug into source_key,archive_name from public.related_source_scopes
    where scope_key=p_scope and document_type=p_type;
  if source_key is null then raise exception 'Unsupported related scope'; end if;
  if exists(select 1 from public.related_scope_models where source=source_key and model_entity_id is null) then raise exception 'Scope models are not reviewed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(source_key,0));
  select started_at into run_started from public.ingestion_runs where id=p_run_id and source=source_key and status='running' for update;
  if run_started is null then raise exception 'Invalid run'; end if;
  select r.started_at into previous_started from public.ingestion_checkpoints c join public.ingestion_runs r on r.id=c.last_successful_run_id where c.source=source_key;
  if previous_started>run_started then raise exception 'Stale run'; end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)=0 then raise exception 'Empty batch'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_records) row where
      row->>'source_url' is null or row->>'source_url' !~ '^https://drs\.faa\.gov/browse/excelExternalWindow/[A-Za-z0-9._-]+$' or
      row->'metadata'->>'metadata_sha256' is null or row->'metadata'->>'metadata_sha256' !~ '^[a-f0-9]{64}$' or
      row->'metadata'->>'metadata_storage_path' is distinct from 'FAA/'||p_type||'/'||archive_name||'/'||(row->'metadata'->>'metadata_sha256')||'.json' or
      row->>'status' not in('current','historical','pending') or jsonb_typeof(row->'models')<>'array' or
      (p_type<>'CAR' and jsonb_array_length(row->'models')=0)
  ) then raise exception 'Invalid source row'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_records) row cross join lateral jsonb_array_elements_text(row->'models') model_value(value)
    where not exists(select 1 from public.related_scope_models m where m.source=source_key and m.model=model_value.value and m.model_entity_id is not null)
  ) then raise exception 'Unmapped model'; end if;

  insert into public.documents(authority,document_type,document_number,title,is_published)
  select distinct on(row->>'document_number') 'FAA',p_type,row->>'document_number',row->>'title',true
  from jsonb_array_elements(p_records) row order by row->>'document_number',row->>'source_version_id'
  on conflict(authority,document_type,document_number) do update set title=excluded.title;

  insert into public.document_versions(document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
  select d.id,row->>'source_version_id',row->>'revision_label',nullif(row->>'revision_date','')::date,row->>'status',row->>'source_url',
    (row->>'retrieved_at')::timestamptz,row->'metadata',true
  from jsonb_array_elements(p_records) row join public.documents d on d.authority='FAA' and d.document_type=p_type and d.document_number=row->>'document_number'
  on conflict(document_id,source_version_id) do update set source_version_id=excluded.source_version_id;

  update public.related_document_matches set is_active=false where source=source_key;
  insert into public.related_document_matches(source,version_id,model,is_active)
  select distinct source_key,v.id,model_value.value,true from jsonb_array_elements(p_records) row
  join public.documents d on d.authority='FAA' and d.document_type=p_type and d.document_number=row->>'document_number'
  join public.document_versions v on v.document_id=d.id and v.source_version_id=row->>'source_version_id'
  cross join lateral jsonb_array_elements_text(row->'models') model_value(value)
  on conflict on constraint related_document_matches_pkey do update set is_active=true;

  with ranked as (
    select d.id document_id,v.id version_id,row_number() over(partition by d.id order by
      case v.status when 'current' then 0 when 'pending' then 1 else 2 end,
      (v.metadata->>'source_modified_at')::timestamptz desc nulls last,v.source_version_id) position
    from jsonb_array_elements(p_records) row
    join public.documents d on d.authority='FAA' and d.document_type=p_type and d.document_number=row->>'document_number'
    join public.document_versions v on v.document_id=d.id and v.source_version_id=row->>'source_version_id'
  ) update public.documents d set current_version_id=ranked.version_id from ranked where d.id=ranked.document_id and ranked.position=1;

  select max((row->'metadata'->>'source_modified_at')::timestamptz) into max_modified from jsonb_array_elements(p_records) row;
  update public.ingestion_runs set status='succeeded',completed_at=now(),records_processed=jsonb_array_length(p_records) where id=p_run_id;
  insert into public.ingestion_checkpoints(source,last_successful_run_id,source_modified_at,updated_at) values(source_key,p_run_id,max_modified,now())
    on conflict(source) do update set last_successful_run_id=excluded.last_successful_run_id,
      source_modified_at=greatest(public.ingestion_checkpoints.source_modified_at,excluded.source_modified_at),updated_at=now();
  select jsonb_agg(jsonb_build_object('identity',row->'metadata'->>'source_identity','version_id',v.id,
    'status',row->>'status','metadata_hash',row->'metadata'->>'metadata_sha256','pdf_hash',null,'models',row->'models')) into observations
  from jsonb_array_elements(p_records) row join public.documents d on d.authority='FAA' and d.document_type=p_type and d.document_number=row->>'document_number'
  join public.document_versions v on v.document_id=d.id and v.source_version_id=row->>'source_version_id';
  perform public.record_related_observations_bulk(source_key,p_run_id,observations);
  return jsonb_array_length(p_records);
end $$;
revoke all on function public.commit_related_catalog(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_related_catalog(uuid,text,text,jsonb) to service_role;
