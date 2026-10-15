-- Generalize immutable TCDS imports and add structured, evidence-bound variant/applicability data.
alter table public.catalog_entities drop constraint catalog_entities_entity_type_check;
alter table public.catalog_entities add constraint catalog_entities_entity_type_check check(entity_type in
  ('aircraft_model','aircraft_family','certification_project','configuration','operating_limit','engine_model','propeller_model','appliance_model','certificate','regulatory_provision','organization','service_document'));

alter table public.relationships drop constraint relationships_relationship_type_check;
alter table public.relationships add constraint relationships_relationship_type_check check(relationship_type in
  ('covered_by','certified_against','applies_to','approved_for','affects_component','references','supersedes','member_of','powered_by','project_for'));

create table public.aircraft_variant_profiles (
  entity_id uuid primary key references public.catalog_entities(id) on delete cascade,
  family_entity_id uuid not null references public.catalog_entities(id) on delete restrict,
  tcds_document_id uuid not null references public.documents(id) on delete restrict,
  evidence_version_id uuid not null references public.document_versions(id) on delete restrict,
  display_name text not null check(length(btrim(display_name)) between 1 and 120),
  market_name text not null check(length(btrim(market_name)) between 1 and 120),
  faa_status text not null check(faa_status in('faa_approved','not_listed_in_current_tcds')),
  approved_on date,
  evidence_page integer not null check(evidence_page>0),
  evidence_excerpt text not null check(length(btrim(evidence_excerpt))>0),
  is_published boolean not null default false,
  check((faa_status='faa_approved' and approved_on is not null) or (faa_status='not_listed_in_current_tcds' and approved_on is null)),
  check(entity_id<>family_entity_id)
);

create table public.aircraft_variant_facts (
  id uuid primary key default gen_random_uuid(),
  variant_entity_id uuid not null references public.aircraft_variant_profiles(entity_id) on delete cascade,
  fact_type text not null check(fact_type in('engine_family','maximum_takeoff_weight','maximum_passengers','maximum_operating_altitude','minimum_crew','vmo','mmo')),
  numeric_value numeric,
  text_value text,
  unit text,
  conditions jsonb not null default '{}'::jsonb check(jsonb_typeof(conditions)='object'),
  evidence_version_id uuid not null references public.document_versions(id) on delete restrict,
  evidence_page integer not null check(evidence_page>0),
  evidence_excerpt text not null check(length(btrim(evidence_excerpt))>0),
  is_published boolean not null default false,
  check((numeric_value is not null and text_value is null) or (numeric_value is null and nullif(btrim(text_value),'') is not null)),
  check((numeric_value is null or numeric_value>=0) and (unit is null or length(btrim(unit)) between 1 and 24)),
  unique(variant_entity_id,fact_type,evidence_version_id)
);

create table public.applicability_rule_sets (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null unique references public.relationships(id) on delete cascade,
  evidence_version_id uuid not null references public.document_versions(id) on delete restrict,
  label text not null check(length(btrim(label)) between 1 and 200),
  outcome text not null check(outcome in('requires_review','inside_reviewed_scope','outside_reviewed_scope')),
  is_published boolean not null default false
);

create table public.applicability_rule_groups (
  id uuid primary key default gen_random_uuid(),
  rule_set_id uuid not null references public.applicability_rule_sets(id) on delete cascade,
  group_order smallint not null check(group_order>0),
  match_operator text not null check(match_operator in('all','any')),
  label text not null check(length(btrim(label)) between 1 and 160),
  unique(rule_set_id,group_order)
);

create table public.applicability_predicates (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.applicability_rule_groups(id) on delete cascade,
  predicate_order smallint not null check(predicate_order>0),
  subject_kind text not null check(subject_kind in('aircraft_model','aircraft_serial','installed_equipment','part_number','component_serial','software_version','stc','drawing_revision','engine_model','completed_action')),
  subject_key text not null check(length(btrim(subject_key)) between 1 and 200),
  comparison text not null check(comparison in('present','absent','equals','one_of','inclusive_range','at_or_before','later_than')),
  expected jsonb not null check(jsonb_typeof(expected) in('object','array','string','number','boolean')),
  evidence_page integer not null check(evidence_page>0),
  evidence_excerpt text not null check(length(btrim(evidence_excerpt))>0),
  unique(group_id,predicate_order)
);

create index aircraft_variant_facts_variant_idx on public.aircraft_variant_facts(variant_entity_id);
create index applicability_groups_set_idx on public.applicability_rule_groups(rule_set_id);
create index applicability_predicates_group_idx on public.applicability_predicates(group_id);

alter table public.aircraft_variant_profiles enable row level security;
alter table public.aircraft_variant_facts enable row level security;
alter table public.applicability_rule_sets enable row level security;
alter table public.applicability_rule_groups enable row level security;
alter table public.applicability_predicates enable row level security;
revoke all on public.aircraft_variant_profiles,public.aircraft_variant_facts,public.applicability_rule_sets,public.applicability_rule_groups,public.applicability_predicates from anon,authenticated;
grant select on public.aircraft_variant_profiles,public.aircraft_variant_facts,public.applicability_rule_sets,public.applicability_rule_groups,public.applicability_predicates to anon,authenticated;
grant all on public.aircraft_variant_profiles,public.aircraft_variant_facts,public.applicability_rule_sets,public.applicability_rule_groups,public.applicability_predicates to service_role;

create policy variant_profiles_public_read on public.aircraft_variant_profiles for select to anon,authenticated using(
  is_published and exists(select 1 from public.catalog_entities e where e.id=entity_id and e.is_published)
  and exists(select 1 from public.catalog_entities f where f.id=family_entity_id and f.is_published)
  and exists(select 1 from public.documents d where d.id=tcds_document_id and d.is_published)
  and exists(select 1 from public.document_versions v where v.id=evidence_version_id and v.is_published));
create policy variant_facts_public_read on public.aircraft_variant_facts for select to anon,authenticated using(
  is_published and exists(select 1 from public.aircraft_variant_profiles p where p.entity_id=variant_entity_id and p.is_published)
  and exists(select 1 from public.document_versions v where v.id=evidence_version_id and v.is_published));
create policy applicability_sets_public_read on public.applicability_rule_sets for select to anon,authenticated using(
  is_published and exists(select 1 from public.relationships r where r.id=relationship_id and r.is_published and r.review_status='reviewed')
  and exists(select 1 from public.document_versions v where v.id=evidence_version_id and v.is_published));
create policy applicability_groups_public_read on public.applicability_rule_groups for select to anon,authenticated using(
  exists(select 1 from public.applicability_rule_sets s where s.id=rule_set_id and s.is_published));
create policy applicability_predicates_public_read on public.applicability_predicates for select to anon,authenticated using(
  exists(select 1 from public.applicability_rule_groups g join public.applicability_rule_sets s on s.id=g.rule_set_id where g.id=group_id and s.is_published));

create function public.commit_tcds_catalog(p_run_id uuid,p_certificate text,p_records jsonb) returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; doc_id uuid; version_id uuid; current_id uuid; source_id text; fingerprint text;
  max_modified timestamptz; run_started timestamptz; previous_started timestamptz; processed integer:=0;
  source_name text; model_name text; current_models jsonb;
begin
  if p_certificate is null or p_certificate !~ '^[A-Z0-9-]{1,20}$' then raise exception 'Invalid certificate'; end if;
  source_name:='FAA:TCDSMODEL:'||p_certificate;
  perform pg_advisory_xact_lock(hashtextextended(source_name,0));
  select started_at into run_started from public.ingestion_runs where id=p_run_id and source=source_name and status='running' for update;
  if run_started is null then raise exception 'Invalid import run'; end if;
  select r.started_at into previous_started from public.ingestion_checkpoints c join public.ingestion_runs r on r.id=c.last_successful_run_id where c.source=source_name;
  if previous_started is not null and previous_started>run_started then raise exception 'Stale import run'; end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)=0 then raise exception 'Empty batch'; end if;
  if (select count(*) from jsonb_array_elements(p_records) x where x->>'status'='current')<>1 then raise exception 'Expected one current revision'; end if;
  insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA','TCDS',p_certificate,'TCDS '||p_certificate,true)
    on conflict(authority,document_type,document_number) do update set is_published=true;
  select id into doc_id from public.documents where authority='FAA' and document_type='TCDS' and document_number=p_certificate;
  for item in select value from jsonb_array_elements(p_records) loop
    source_id:=item->>'source_version_id';fingerprint:=item->'metadata'->>'snapshot_sha256';
    if source_id is null or source_id !~ '^[A-Za-z0-9]+\.[0-9]+$' or fingerprint is null or fingerprint !~ '^[a-f0-9]{64}$'
      or item->>'content_sha256' is null or item->>'content_sha256' !~ '^[a-f0-9]{64}$'
      or item->'metadata'->>'certificate' is distinct from p_certificate or jsonb_typeof(item->'metadata'->'model_list')<>'array'
      or item->>'source_url' is distinct from 'https://drs.faa.gov/browse/excelExternalWindow/'||source_id
      or item->>'storage_path' is distinct from 'FAA/TCDS/'||p_certificate||'/'||(item->>'content_sha256')||'.pdf'
      or item->'metadata'->>'metadata_storage_path' !~ ('^FAA/TCDS/'||p_certificate||'/[a-f0-9]{64}\.json$')
      or item->'metadata'->>'source_modified_at' is null then raise exception 'Invalid source snapshot'; end if;
    version_id:=null;
    select id into version_id from public.document_versions where document_id=doc_id and source_version_id=source_id and content_sha256 is null;
    if version_id is not null then
      update public.document_versions set content_sha256=item->>'content_sha256',storage_path=item->>'storage_path',metadata=item->'metadata',
        retrieved_at=(item->>'retrieved_at')::timestamptz,revision_label=item->>'revision_label',revision_date=(item->>'revision_date')::date,status=item->>'status' where id=version_id;
    elsif exists(select 1 from public.document_versions where document_id=doc_id and source_version_id=source_id and metadata->>'snapshot_sha256'=fingerprint) then
      select id into version_id from public.document_versions where document_id=doc_id and source_version_id=source_id;
      update public.document_versions set status=item->>'status' where id=version_id;
    else
      insert into public.document_versions(document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,content_sha256,storage_path,metadata,is_published)
      values(doc_id,source_id||'@'||fingerprint,item->>'revision_label',(item->>'revision_date')::date,item->>'status',item->>'source_url',(item->>'retrieved_at')::timestamptz,item->>'content_sha256',item->>'storage_path',item->'metadata',true)
      on conflict(document_id,source_version_id) do update set status=excluded.status returning id into version_id;
    end if;
    if item->>'status'='current' then current_id:=version_id;current_models:=item->'metadata'->'model_list';end if;
    max_modified:=greatest(max_modified,(item->'metadata'->>'source_modified_at')::timestamptz);processed:=processed+1;
  end loop;
  update public.document_versions set status='historical' where document_id=doc_id and status='current' and id<>current_id;
  update public.documents set current_version_id=current_id where id=doc_id;
  for model_name in select jsonb_array_elements_text(current_models) loop
    if length(btrim(model_name))=0 or length(model_name)>160 then raise exception 'Invalid model'; end if;
    insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published) values('FAA','aircraft_model',model_name,model_name,true)
      on conflict(authority,entity_type,natural_key) do update set label=excluded.label,is_published=true;
  end loop;
  update public.ingestion_runs set status='succeeded',completed_at=now(),records_processed=processed where id=p_run_id;
  insert into public.ingestion_checkpoints(source,last_successful_run_id,source_modified_at,updated_at) values(source_name,p_run_id,max_modified,now())
    on conflict(source) do update set last_successful_run_id=excluded.last_successful_run_id,source_modified_at=greatest(public.ingestion_checkpoints.source_modified_at,excluded.source_modified_at),updated_at=now();
  return processed;
end $$;
revoke all on function public.commit_tcds_catalog(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_tcds_catalog(uuid,text,jsonb) to service_role;

create or replace function public.catalog_last_checked(p_number text) returns timestamptz
language sql stable security definer set search_path=pg_catalog,public as $$
  select r.completed_at from public.ingestion_checkpoints c join public.ingestion_runs r on r.id=c.last_successful_run_id
  where c.source='FAA:TCDSMODEL:'||upper(btrim(p_number)) and r.status='succeeded'
    and exists(select 1 from public.documents d where d.authority='FAA' and d.document_type='TCDS' and d.document_number=upper(btrim(p_number)) and d.is_published)
$$;

create view public.aircraft_variant_catalog with(security_invoker=true) as
select p.entity_id,p.family_entity_id,p.tcds_document_id,d.document_number as tcds_number,e.natural_key as model_key,p.display_name,p.market_name,p.faa_status,
  p.approved_on::text,p.evidence_version_id,p.evidence_page,p.evidence_excerpt,
  coalesce(jsonb_object_agg(f.fact_type,jsonb_build_object('numeric_value',f.numeric_value,'text_value',f.text_value,'unit',f.unit,'conditions',f.conditions,'evidence_page',f.evidence_page,'evidence_excerpt',f.evidence_excerpt)) filter(where f.id is not null),'{}'::jsonb) as facts
from public.aircraft_variant_profiles p join public.documents d on d.id=p.tcds_document_id join public.catalog_entities e on e.id=p.entity_id
left join public.aircraft_variant_facts f on f.variant_entity_id=p.entity_id and f.is_published
where p.is_published group by p.entity_id,p.family_entity_id,p.tcds_document_id,d.document_number,e.natural_key,p.display_name,p.market_name,p.faa_status,p.approved_on,p.evidence_version_id,p.evidence_page,p.evidence_excerpt;
grant select on public.aircraft_variant_catalog to anon,authenticated,service_role;

create view public.relationship_applicability_rules with(security_invoker=true) as
select s.relationship_id,s.label as rule_set_label,s.outcome,g.id as group_id,g.group_order,g.match_operator,g.label as group_label,
  p.id as predicate_id,p.predicate_order,p.subject_kind,p.subject_key,p.comparison,p.expected,p.evidence_page,p.evidence_excerpt
from public.applicability_rule_sets s join public.applicability_rule_groups g on g.rule_set_id=s.id
join public.applicability_predicates p on p.group_id=g.id where s.is_published;
grant select on public.relationship_applicability_rules to anon,authenticated,service_role;
