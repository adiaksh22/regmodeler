-- Generalize related-source ingestion while preserving certificate/model tuple integrity.
alter table public.related_document_matches drop constraint related_document_matches_model_check;

create table public.related_source_scopes (
  source text primary key,
  scope_key text not null,
  document_type text not null check(document_type in('AD','STC','CAR')),
  archive_slug text not null check(archive_slug~'^[A-Z0-9]+$'),
  certificate text,
  unique(scope_key,document_type),
  check((document_type='STC' and certificate is not null) or document_type<>'STC')
);

create table public.related_scope_models (
  source text not null references public.related_source_scopes(source) on delete cascade,
  model text not null,
  source_model text not null,
  model_entity_id uuid references public.catalog_entities(id) on delete restrict,
  primary key(source,model),
  unique(source,source_model)
);

insert into public.related_source_scopes(source,scope_key,document_type,archive_slug,certificate) values
  ('FAA:ADFRAWD:PA28','PA28','AD','PA28',null),('FAA:STC:PA28','PA28','STC','PA28','2A13'),('FAA:CAR:PA28','PA28','CAR','PA28',null),
  ('FAA:ADFRAWD:B737','B737','AD','B737',null),('FAA:STC:B737','B737','STC','B737','A16WE');

insert into public.related_scope_models(source,model,source_model,model_entity_id)
select source,model,source_model,e.id from (values
  ('FAA:ADFRAWD:PA28','PA-28-140','PA-28-140','PA-28-140'),('FAA:ADFRAWD:PA28','PA-28-181','PA-28-181','PA-28-181'),
  ('FAA:STC:PA28','PA-28-140','PA-28-140','PA-28-140'),('FAA:STC:PA28','PA-28-181','PA-28-181','PA-28-181'),
  ('FAA:ADFRAWD:B737','737-700','737-700 Series','737-700 Series'),('FAA:ADFRAWD:B737','737-800','737-800 Series','737-800 Series'),
  ('FAA:ADFRAWD:B737','737-900ER','737-900ER Series','737-900ER Series'),('FAA:ADFRAWD:B737','737-8','737-8','737-8'),
  ('FAA:ADFRAWD:B737','737-9','737-9','737-9'),('FAA:STC:B737','737-700','737-700 Series','737-700 Series'),
  ('FAA:STC:B737','737-800','737-800 Series','737-800 Series'),('FAA:STC:B737','737-900ER','737-900ER Series','737-900ER Series'),
  ('FAA:STC:B737','737-8','737-8','737-8'),('FAA:STC:B737','737-9','737-9','737-9')
) mapped(source,model,source_model,natural_key)
left join public.catalog_entities e on e.authority='FAA' and e.entity_type='aircraft_model' and e.natural_key=mapped.natural_key;

alter table public.related_document_matches add constraint related_document_matches_scope_model_fk
  foreign key(source,model) references public.related_scope_models(source,model) on delete restrict;

alter table public.related_source_scopes enable row level security;
alter table public.related_scope_models enable row level security;
revoke all on public.related_source_scopes,public.related_scope_models from anon,authenticated;
grant select on public.related_source_scopes,public.related_scope_models to anon,authenticated;
grant all on public.related_source_scopes,public.related_scope_models to service_role;
create policy related_source_scopes_public on public.related_source_scopes for select to anon,authenticated using(true);
create policy related_scope_models_public on public.related_scope_models for select to anon,authenticated using(
  model_entity_id is not null and exists(select 1 from public.catalog_entities e where e.id=model_entity_id and e.is_published)
);

create function public.commit_related_catalog(p_run_id uuid,p_scope text,p_type text,p_records jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  source_key text; archive_name text; run_started timestamptz; previous_started timestamptz;
  item jsonb; doc_id uuid; version_id uuid; model_name text; doc_number text; max_modified timestamptz; observations jsonb;
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
  update public.related_document_matches set is_active=false where source=source_key;
  for item in select value from jsonb_array_elements(p_records) loop
    if item->>'source_url' is null or item->>'source_url' !~ '^https://drs\.faa\.gov/browse/excelExternalWindow/[A-Za-z0-9._-]+$' or
      item->'metadata'->>'metadata_sha256' is null or item->'metadata'->>'metadata_sha256' !~ '^[a-f0-9]{64}$' or
      item->'metadata'->>'metadata_storage_path' is distinct from 'FAA/'||p_type||'/'||archive_name||'/'||(item->'metadata'->>'metadata_sha256')||'.json' or
      item->>'status' not in('current','historical','pending') or jsonb_typeof(item->'models')<>'array' or
      (p_type<>'CAR' and jsonb_array_length(item->'models')=0) then raise exception 'Invalid source row'; end if;
    insert into public.documents(authority,document_type,document_number,title,is_published)
      values('FAA',p_type,item->>'document_number',item->>'title',true)
      on conflict(authority,document_type,document_number) do update set title=excluded.title returning id into doc_id;
    insert into public.document_versions(document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
      values(doc_id,item->>'source_version_id',item->>'revision_label',(item->>'revision_date')::date,item->>'status',item->>'source_url',(item->>'retrieved_at')::timestamptz,item->'metadata',true)
      on conflict(document_id,source_version_id) do update set source_version_id=excluded.source_version_id returning id into version_id;
    for model_name in select jsonb_array_elements_text(item->'models') loop
      if not exists(select 1 from public.related_scope_models where source=source_key and model=model_name and model_entity_id is not null) then raise exception 'Unmapped model'; end if;
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
    on conflict(source) do update set last_successful_run_id=excluded.last_successful_run_id,
      source_modified_at=greatest(public.ingestion_checkpoints.source_modified_at,excluded.source_modified_at),updated_at=now();
  select jsonb_agg(jsonb_build_object('identity',row_item->'metadata'->>'source_identity','version_id',v.id,
    'status',row_item->>'status','metadata_hash',row_item->'metadata'->>'metadata_sha256','pdf_hash',null,'models',row_item->'models')) into observations
  from jsonb_array_elements(p_records) row_item join public.documents d on d.authority='FAA' and d.document_type=p_type and d.document_number=row_item->>'document_number'
  join public.document_versions v on v.document_id=d.id and v.source_version_id=row_item->>'source_version_id';
  perform public.record_source_observations(source_key,p_run_id,observations);
  return jsonb_array_length(p_records);
end $$;
revoke all on function public.commit_related_catalog(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_related_catalog(uuid,text,text,jsonb) to service_role;

create or replace function public.related_last_checked(p_model text) returns table(document_type text,last_checked timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
select s.document_type,r.completed_at from public.related_source_scopes s
join public.related_scope_models m on m.source=s.source and m.model=p_model
join public.ingestion_checkpoints c on c.source=s.source join public.ingestion_runs r on r.id=c.last_successful_run_id
where s.document_type in('AD','STC') and r.status='succeeded'
$$;
revoke all on function public.related_last_checked(text) from public;
grant execute on function public.related_last_checked(text) to anon,authenticated,service_role;

create or replace function public.source_monitoring() returns table(source text,last_success timestamptz,last_attempt timestamptz,status text,baseline_ready boolean)
language sql stable security definer set search_path=pg_catalog,public as $$
select s.source,c.updated_at,r.started_at,r.status,exists(select 1 from public.source_observations o where o.source=s.source)
from (
  select source from public.related_source_scopes where document_type in('AD','STC')
  union select 'FAA:TCDSMODEL:2A13' union select 'FAA:TCDSMODEL:A16WE'
) s left join public.ingestion_checkpoints c on c.source=s.source
left join lateral(select started_at,status from public.ingestion_runs where source=s.source order by started_at desc limit 1) r on true
$$;
revoke all on function public.source_monitoring() from public;
grant execute on function public.source_monitoring() to anon,authenticated,service_role;

alter function public.review_boeing_737_family() rename to review_boeing_737_family_profiles_core;
revoke all on function public.review_boeing_737_family_profiles_core() from public,anon,authenticated,service_role;
create function public.review_boeing_737_family() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare reviewed integer;
begin
  reviewed:=public.review_boeing_737_family_profiles_core();
  update public.related_scope_models m set model_entity_id=e.id from public.catalog_entities e
  where m.source in('FAA:ADFRAWD:B737','FAA:STC:B737') and e.authority='FAA' and e.entity_type='aircraft_model'
    and e.natural_key=m.source_model and e.is_published;
  if exists(select 1 from public.related_scope_models where source in('FAA:ADFRAWD:B737','FAA:STC:B737') and model_entity_id is null) then
    raise exception 'Boeing related-source model mapping incomplete';
  end if;
  return reviewed;
end $$;
revoke all on function public.review_boeing_737_family() from public,anon,authenticated;
grant execute on function public.review_boeing_737_family() to service_role;
