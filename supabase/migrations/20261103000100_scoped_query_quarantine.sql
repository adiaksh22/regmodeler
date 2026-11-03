create table public.source_query_quarantine (
 source text not null references public.related_source_scopes(source),identity text not null,
 metadata_hash text not null check(metadata_hash ~ '^[a-f0-9]{64}$'),
 document_number text not null,source_url text not null,metadata_storage_path text not null,
 source_modified_at timestamptz,source_status text not null check(source_status in('current','historical','pending')),
 reason text not null check(reason='certificate_model_tuple_unconfirmed'),
 active boolean not null default true,last_seen_run uuid not null references public.ingestion_runs(id),
 primary key(source,identity,metadata_hash)
);
create unique index quarantine_active_identity on public.source_query_quarantine(source,identity) where active;
create table public.source_query_coverage (
 source text primary key references public.related_source_scopes(source),run_id uuid not null references public.ingestion_runs(id),
 returned_count integer not null,accepted_count integer not null,quarantined_count integer not null,
 checked_at timestamptz not null default now(),
 check(returned_count>0 and accepted_count>=0 and quarantined_count>=0 and returned_count=accepted_count+quarantined_count)
);
alter table public.source_query_quarantine enable row level security;
alter table public.source_query_coverage enable row level security;
revoke all on public.source_query_quarantine,public.source_query_coverage from anon,authenticated;
grant all on public.source_query_quarantine,public.source_query_coverage to service_role;

-- A quarantined identity was returned. Preserve its last trusted observation
-- without calling it absent; model matches are separately suspended by commit.
create or replace function public.record_related_observations_bulk(p_source text,p_run uuid,p_rows jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare baseline boolean;
begin
 select exists(select 1 from public.source_observations where source=p_source) into baseline;
 if baseline then
  with incoming as (
   select row->>'identity' identity,(row->>'version_id')::uuid version_id,row->>'status' status,
    row->>'metadata_hash' metadata_hash,row->>'pdf_hash' pdf_hash,array(select jsonb_array_elements_text(row->'models')) models
   from jsonb_array_elements(p_rows) row
  ), compared as (
   select i.*,o.version_id old_version_id,o.status old_status,o.metadata_hash old_metadata_hash,o.pdf_hash old_pdf_hash,o.models old_models,o.active old_active,
    array(select distinct unnest(coalesce(o.models,'{}')||i.models)) event_models,
    array_remove(array[case when o.status is distinct from i.status then 'source_status' end,
     case when o.metadata_hash is distinct from i.metadata_hash then 'metadata' end,
     case when o.pdf_hash is distinct from i.pdf_hash then 'original_pdf_bytes' end],null) changed_fields
   from incoming i left join public.source_observations o on o.source=p_source and o.identity=i.identity
  ) insert into public.source_change_events(source,identity,run_id,kind,old_version_id,new_version_id,models,changed_fields,old_source_status,new_source_status)
  select p_source,identity,p_run,case when old_version_id is null then 'discovered' when not old_active then 'returned_to_index' else 'changed' end,
   old_version_id,version_id,event_models,changed_fields,old_status,status
  from compared where cardinality(event_models)>0 and (old_version_id is null or not old_active or cardinality(changed_fields)>0) on conflict do nothing;

  insert into public.source_change_events(source,identity,run_id,kind,old_version_id,models,old_source_status)
  select p_source,o.identity,p_run,'missing_from_index',o.version_id,o.models,o.status
  from public.source_observations o where o.source=p_source and o.active and cardinality(o.models)>0
   and not exists(select 1 from jsonb_array_elements(p_rows) row where row->>'identity'=o.identity)
   and not exists(select 1 from public.source_query_quarantine q where q.source=p_source and q.identity=o.identity and q.active)
  on conflict do nothing;
 end if;
 update public.source_observations o set active=false,run_id=p_run where o.source=p_source and o.active
  and not exists(select 1 from jsonb_array_elements(p_rows) row where row->>'identity'=o.identity)
  and not exists(select 1 from public.source_query_quarantine q where q.source=p_source and q.identity=o.identity and q.active);
 insert into public.source_observations(source,identity,version_id,status,metadata_hash,pdf_hash,models,active,run_id)
 select p_source,row->>'identity',(row->>'version_id')::uuid,row->>'status',row->>'metadata_hash',row->>'pdf_hash',
  array(select jsonb_array_elements_text(row->'models')),true,p_run from jsonb_array_elements(p_rows) row
 on conflict(source,identity) do update set version_id=excluded.version_id,status=excluded.status,metadata_hash=excluded.metadata_hash,
  pdf_hash=excluded.pdf_hash,models=excluded.models,active=true,run_id=excluded.run_id;
end $$;

create function public.commit_related_query(p_run_id uuid,p_scope text,p_type text,p_records jsonb,p_quarantined jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare scope_row public.related_source_scopes%rowtype; started timestamptz; previous_started timestamptz;
 accepted integer; held integer; max_modified timestamptz; limit_count integer;
begin
 select * into scope_row from public.related_source_scopes where scope_key=p_scope and document_type=p_type;
 if scope_row.source is null then raise exception 'Unsupported scope';end if;
 perform pg_advisory_xact_lock(hashtextextended(scope_row.source,0));
 select started_at into started from public.ingestion_runs where id=p_run_id and source=scope_row.source and status='running' for update;
 if started is null then raise exception 'Invalid run';end if;
 select r.started_at into previous_started from public.ingestion_checkpoints c join public.ingestion_runs r on r.id=c.last_successful_run_id where c.source=scope_row.source;
 if previous_started>started then raise exception 'Stale run';end if;
 if jsonb_typeof(p_records) is distinct from 'array' or jsonb_typeof(p_quarantined) is distinct from 'array' then raise exception 'Invalid query inventory';end if;
 accepted:=jsonb_array_length(p_records);held:=jsonb_array_length(p_quarantined);
 limit_count:=case when p_type='AD' then 1000 when p_type='CAR' then 100 when p_scope='B737' then 4000 else 3000 end;
 if accepted+held=0 or accepted+held>limit_count or (held>0 and p_type<>'STC') then raise exception 'Invalid query inventory';end if;
 if exists(select 1 from public.related_scope_models where source=scope_row.source and model_entity_id is null) then raise exception 'Unreviewed scope';end if;
 if (select count(distinct row->'metadata'->>'source_identity') from jsonb_array_elements(p_records||p_quarantined) row)<>accepted+held then raise exception 'Duplicate query identity';end if;
 if exists(select 1 from jsonb_array_elements(p_quarantined) row where
  coalesce(row->'metadata'->>'source_identity','') !~ '^[A-Za-z0-9_-]+[.]0001$'
  or row->>'source_url' is distinct from 'https://drs.faa.gov/browse/excelExternalWindow/'||(row->'metadata'->>'source_identity')
  or coalesce(row->'metadata'->>'metadata_sha256','') !~ '^[a-f0-9]{64}$'
  or row->'metadata'->>'metadata_storage_path' is distinct from 'FAA/'||p_type||'/'||scope_row.archive_slug||'/'||(row->'metadata'->>'metadata_sha256')||'.json'
  or row->'models' is distinct from '[]'::jsonb or coalesce(row->>'status','') not in('current','historical','pending')
  or length(coalesce(row->>'document_number','')) not between 1 and 160
 ) then raise exception 'Invalid quarantine row';end if;

 update public.source_query_quarantine set active=false where source=scope_row.source;
 insert into public.source_query_quarantine(source,identity,metadata_hash,document_number,source_url,metadata_storage_path,source_modified_at,source_status,reason,last_seen_run)
 select scope_row.source,row->'metadata'->>'source_identity',row->'metadata'->>'metadata_sha256',row->>'document_number',row->>'source_url',row->'metadata'->>'metadata_storage_path',
  (row->'metadata'->>'source_modified_at')::timestamptz,row->>'status','certificate_model_tuple_unconfirmed',p_run_id
 from jsonb_array_elements(p_quarantined) row
 on conflict(source,identity,metadata_hash) do update set active=true,last_seen_run=excluded.last_seen_run;
 if accepted>0 then
  perform public.commit_related_catalog(p_run_id,p_scope,p_type,p_records);
 else
  update public.related_document_matches set is_active=false where source=scope_row.source;
  perform public.record_related_observations_bulk(scope_row.source,p_run_id,'[]');
  update public.ingestion_runs set status='succeeded',completed_at=now() where id=p_run_id;
  insert into public.ingestion_checkpoints(source,last_successful_run_id) values(scope_row.source,p_run_id)
   on conflict(source) do update set last_successful_run_id=excluded.last_successful_run_id,updated_at=now();
 end if;
 select max((row->'metadata'->>'source_modified_at')::timestamptz) into max_modified from jsonb_array_elements(p_records||p_quarantined) row;
 update public.ingestion_checkpoints set source_modified_at=greatest(source_modified_at,max_modified) where source=scope_row.source;
 update public.ingestion_runs set records_processed=accepted+held where id=p_run_id;
 insert into public.source_query_coverage(source,run_id,returned_count,accepted_count,quarantined_count) values(scope_row.source,p_run_id,accepted+held,accepted,held)
 on conflict(source) do update set run_id=excluded.run_id,returned_count=excluded.returned_count,accepted_count=excluded.accepted_count,quarantined_count=excluded.quarantined_count,checked_at=now();
 return accepted;
end $$;
revoke all on function public.commit_related_query(uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_related_query(uuid,text,text,jsonb,jsonb) to service_role;

create function public.source_monitoring_coverage()
returns table(source text,last_success timestamptz,last_attempt timestamptz,status text,baseline_ready boolean,
 returned_count integer,accepted_count integer,quarantined_count integer,coverage_checked_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
 select m.*,c.returned_count,c.accepted_count,c.quarantined_count,c.checked_at from public.source_monitoring() m
 left join public.source_query_coverage c on c.source=m.source;
$$;
revoke all on function public.source_monitoring_coverage() from public;
grant execute on function public.source_monitoring_coverage() to anon,authenticated,service_role;
