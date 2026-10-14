create table public.source_observations (
  source text not null, identity text not null, version_id uuid not null references public.document_versions(id),
  status text not null, metadata_hash text, pdf_hash text, models text[] not null,
  active boolean not null default true, run_id uuid not null references public.ingestion_runs(id),
  primary key(source,identity)
);
create table public.source_change_events (
  id uuid primary key default gen_random_uuid(),source text not null,identity text not null,
  run_id uuid not null references public.ingestion_runs(id), detected_at timestamptz not null default now(),
  kind text not null check(kind in('discovered','changed','missing_from_index','returned_to_index')),
  old_version_id uuid references public.document_versions(id),new_version_id uuid references public.document_versions(id),
  models text[] not null,changed_fields text[] not null default '{}',old_source_status text,new_source_status text,
  unique(source,identity,run_id)
);
alter table public.source_observations enable row level security;
alter table public.source_change_events enable row level security;
revoke all on public.source_observations,public.source_change_events from anon,authenticated;
grant all on public.source_observations,public.source_change_events to service_role;
grant select on public.source_change_events to anon,authenticated;
create policy events_public on public.source_change_events for select to anon,authenticated using (
  (old_version_id is null or exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id where v.id=old_version_id and v.is_published and d.is_published)) and
  (new_version_id is null or exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id where v.id=new_version_id and v.is_published and d.is_published))
);

create function public.record_source_observations(p_source text,p_run uuid,p_rows jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; old public.source_observations%rowtype; baseline boolean; fields text[]; event_kind text; selected_models text[];
begin
  select exists(select 1 from public.source_observations where source=p_source) into baseline;
  for item in select value from jsonb_array_elements(p_rows) loop
    select * into old from public.source_observations where source=p_source and identity=item->>'identity';
    fields:='{}'; event_kind:=null;
    if old.identity is null then event_kind:='discovered';
    else
      if not old.active then event_kind:='returned_to_index'; end if;
      if old.status is distinct from item->>'status' then fields:=array_append(fields,'source_status'); end if;
      if old.metadata_hash is distinct from item->>'metadata_hash' then fields:=array_append(fields,'metadata'); end if;
      if old.pdf_hash is distinct from item->>'pdf_hash' then fields:=array_append(fields,'original_pdf_bytes'); end if;
      if event_kind is null and cardinality(fields)>0 then event_kind:='changed'; end if;
    end if;
    select array_agg(distinct x) into selected_models from (
      select jsonb_array_elements_text(item->'models') x union select unnest(coalesce(old.models,'{}'))
    ) scope;
    if baseline and event_kind is not null and cardinality(selected_models)>0 then
      insert into public.source_change_events(source,identity,run_id,kind,old_version_id,new_version_id,models,changed_fields,old_source_status,new_source_status)
      values(p_source,item->>'identity',p_run,event_kind,old.version_id,(item->>'version_id')::uuid,selected_models,fields,old.status,item->>'status') on conflict do nothing;
    end if;
    insert into public.source_observations(source,identity,version_id,status,metadata_hash,pdf_hash,models,active,run_id)
      values(p_source,item->>'identity',(item->>'version_id')::uuid,item->>'status',item->>'metadata_hash',item->>'pdf_hash',array(select jsonb_array_elements_text(item->'models')),true,p_run)
      on conflict(source,identity) do update set version_id=excluded.version_id,status=excluded.status,metadata_hash=excluded.metadata_hash,pdf_hash=excluded.pdf_hash,models=excluded.models,active=true,run_id=excluded.run_id;
  end loop;
  for old in select * from public.source_observations o where o.source=p_source and o.active and not exists(select 1 from jsonb_array_elements(p_rows) row where row->>'identity'=o.identity) loop
    if cardinality(old.models)>0 then
      insert into public.source_change_events(source,identity,run_id,kind,old_version_id,models,old_source_status)
        values(p_source,old.identity,p_run,'missing_from_index',old.version_id,old.models,old.status) on conflict do nothing;
    end if;
    update public.source_observations set active=false,run_id=p_run where source=p_source and identity=old.identity;
  end loop;
end $$;
revoke all on function public.record_source_observations(text,uuid,jsonb) from public,anon,authenticated,service_role;

alter function public.commit_pa28_related(uuid,text,jsonb) rename to commit_pa28_related_core;
revoke all on function public.commit_pa28_related_core(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.commit_pa28_related(p_run_id uuid,p_type text,p_records jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result integer; observations jsonb;
begin
  result:=public.commit_pa28_related_core(p_run_id,p_type,p_records);
  select jsonb_agg(jsonb_build_object('identity',item->'metadata'->>'source_identity','version_id',v.id,
    'status',item->>'status','metadata_hash',item->'metadata'->>'metadata_sha256','pdf_hash',null,'models',item->'models')) into observations
  from jsonb_array_elements(p_records) item join public.documents d on d.authority='FAA' and d.document_type=p_type and d.document_number=item->>'document_number'
  join public.document_versions v on v.document_id=d.id and v.source_version_id=item->>'source_version_id';
  perform public.record_source_observations('FAA:'||case p_type when 'AD' then 'ADFRAWD' else p_type end||':PA28',p_run_id,observations);
  return result;
end $$;
revoke all on function public.commit_pa28_related(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_pa28_related(uuid,text,jsonb) to service_role;

alter function public.commit_pa28_tcds(uuid,jsonb) rename to commit_pa28_tcds_core;
revoke all on function public.commit_pa28_tcds_core(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.commit_pa28_tcds(p_run_id uuid,p_records jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result integer; observations jsonb;
begin
  result:=public.commit_pa28_tcds_core(p_run_id,p_records);
  select jsonb_agg(jsonb_build_object('identity',item->>'source_version_id','version_id',v.id,'status',item->>'status',
    'metadata_hash',substring(item->'metadata'->>'metadata_storage_path' from '([a-f0-9]{64})[.]json$'),
    'pdf_hash',item->>'content_sha256','models',jsonb_build_array('PA-28-140','PA-28-181'))) into observations
  from jsonb_array_elements(p_records) item join public.documents d on d.authority='FAA' and d.document_type='TCDS' and d.document_number='2A13'
  join public.document_versions v on v.document_id=d.id and v.source_url=item->>'source_url' and v.metadata->>'snapshot_sha256'=item->'metadata'->>'snapshot_sha256';
  perform public.record_source_observations('FAA:TCDSMODEL:2A13',p_run_id,observations);
  return result;
end $$;
revoke all on function public.commit_pa28_tcds(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.commit_pa28_tcds(uuid,jsonb) to service_role;

create view public.source_change_feed with(security_invoker=true) as
select e.id,e.detected_at,e.kind,e.models,e.changed_fields,e.old_source_status,e.new_source_status,d.document_type,d.document_number,
  e.old_version_id,e.new_version_id,ov.source_url as old_source_url,nv.source_url as new_source_url,
  ov.revision_label as old_revision,nv.revision_label as new_revision
from public.source_change_events e left join public.document_versions ov on ov.id=e.old_version_id
left join public.document_versions nv on nv.id=e.new_version_id join public.documents d on d.id=coalesce(nv.document_id,ov.document_id);
grant select on public.source_change_feed to anon,authenticated,service_role;

create function public.source_monitoring() returns table(source text,last_success timestamptz,last_attempt timestamptz,status text,baseline_ready boolean)
language sql stable security definer set search_path=pg_catalog,public as $$
select s.source,c.updated_at,r.started_at,r.status,exists(select 1 from public.source_observations o where o.source=s.source)
from (values('FAA:TCDSMODEL:2A13'),('FAA:ADFRAWD:PA28'),('FAA:STC:PA28')) s(source)
left join public.ingestion_checkpoints c on c.source=s.source
left join lateral(select started_at,status from public.ingestion_runs where source=s.source order by started_at desc limit 1) r on true
$$;
revoke all on function public.source_monitoring() from public;
grant execute on function public.source_monitoring() to anon,authenticated,service_role;
