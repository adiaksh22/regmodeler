-- Canonical source identities are separate from retrieved version snapshots.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  authority text not null,
  document_type text not null check (document_type in ('TCDS','AD','STC','CFR','CAR','AC','SAIB','SPECIAL_CONDITION')),
  document_number text not null check (document_number = upper(btrim(document_number)) and length(document_number) > 0),
  title text not null,
  current_version_id uuid,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (authority, document_type, document_number)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id),
  source_version_id text not null,
  revision_label text not null,
  revision_date date,
  status text not null check (status in ('current','historical','pending')),
  source_url text not null check (source_url ~ '^https://'),
  retrieved_at timestamptz not null,
  effective_from date,
  effective_to date,
  content_sha256 text check (content_sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  unique (document_id, source_version_id),
  unique (document_id, id)
);

alter table public.documents add constraint documents_current_version_fk
  foreign key (id, current_version_id) references public.document_versions(document_id, id);
create index document_versions_document_date_idx on public.document_versions(document_id, retrieved_at desc);

create table public.catalog_entities (
  id uuid primary key default gen_random_uuid(),
  authority text not null,
  entity_type text not null check (entity_type in ('aircraft_model','engine_model','propeller_model','appliance_model','certificate','regulatory_provision','organization')),
  natural_key text not null,
  label text not null,
  aliases text[] not null default '{}',
  is_published boolean not null default false,
  unique (authority, entity_type, natural_key)
);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.catalog_entities(id),
  target_entity_id uuid not null references public.catalog_entities(id),
  relationship_type text not null check (relationship_type in ('covered_by','certified_against','applies_to','approved_for','references','supersedes')),
  evidence_version_id uuid not null references public.document_versions(id),
  evidence_page integer check (evidence_page > 0),
  evidence_section text,
  evidence_excerpt text not null check (length(btrim(evidence_excerpt)) > 0),
  applicability_conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(applicability_conditions) = 'object'),
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','reviewed','rejected')),
  is_published boolean not null default false,
  check (source_entity_id <> target_entity_id),
  check (evidence_page is not null or nullif(btrim(evidence_section), '') is not null)
);
create index relationships_source_idx on public.relationships(source_entity_id);
create index relationships_target_idx on public.relationships(target_entity_id);

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid not null references public.catalog_entities(id),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, entity_id)
);
create index watchlists_user_idx on public.watchlists(user_id);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('running','succeeded','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_processed integer not null default 0 check (records_processed >= 0),
  error_code text,
  check ((status = 'running' and completed_at is null) or (status <> 'running' and completed_at is not null))
);

create table public.ingestion_checkpoints (
  source text primary key,
  last_successful_run_id uuid references public.ingestion_runs(id),
  source_modified_at timestamptz,
  updated_at timestamptz not null default now()
);

-- No client can publish/edit regulatory data or read importer internals.
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.catalog_entities enable row level security;
alter table public.relationships enable row level security;
alter table public.watchlists enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.ingestion_checkpoints enable row level security;

revoke all on public.documents, public.document_versions, public.catalog_entities,
  public.relationships, public.watchlists, public.ingestion_runs, public.ingestion_checkpoints
  from anon, authenticated;
grant select on public.documents, public.document_versions, public.catalog_entities, public.relationships to anon, authenticated;
grant select, insert, update, delete on public.watchlists to authenticated;
grant all on public.documents, public.document_versions, public.catalog_entities,
  public.relationships, public.watchlists, public.ingestion_runs, public.ingestion_checkpoints to service_role;

create policy documents_public_read on public.documents for select to anon, authenticated using (is_published);
create policy versions_public_read on public.document_versions for select to anon, authenticated using (
  is_published and exists (select 1 from public.documents d where d.id = document_id and d.is_published)
);
create policy entities_public_read on public.catalog_entities for select to anon, authenticated using (is_published);
create policy relationships_public_read on public.relationships for select to anon, authenticated using (
  is_published and review_status = 'reviewed'
  and exists (select 1 from public.catalog_entities e where e.id = source_entity_id and e.is_published)
  and exists (select 1 from public.catalog_entities e where e.id = target_entity_id and e.is_published)
  and exists (select 1 from public.document_versions v where v.id = evidence_version_id and v.is_published)
);
create policy watchlists_owner on public.watchlists for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (
    select 1 from public.catalog_entities e where e.id = entity_id and e.is_published
  ));

-- Invoker views preserve underlying RLS (ordinary owner views can bypass it).
create view public.tcds_catalog with (security_invoker = true) as
select d.id, d.authority, d.document_number as tcds_number,
  v.revision_label as revision, v.revision_date::text as revision_date,
  v.source_url as url, coalesce(v.metadata->>'model', '') as model,
  v.status, v.metadata->>'holder' as holder,
  v.metadata->>'product_type' as product_type, v.retrieved_at
from public.documents d join public.document_versions v on v.id = d.current_version_id
where d.document_type = 'TCDS' and d.is_published and v.is_published
  and v.status in ('current','historical');
grant select on public.tcds_catalog to anon, authenticated, service_role;

create function public.search_tcds(search_query text default '', result_limit integer default 20)
returns setof public.tcds_catalog
language sql stable security invoker set search_path = public, pg_catalog
as $$
  select * from public.tcds_catalog c
  where search_query is not null and length(search_query) <= 200
    and strpos(lower(c.tcds_number || ' ' || c.model || ' ' || coalesce(c.holder,'')), lower(btrim(search_query))) > 0
  order by (c.tcds_number = upper(btrim(search_query))) desc, c.tcds_number
  limit least(greatest(coalesce(result_limit,20),1),50);
$$;
revoke all on function public.search_tcds(text,integer) from public;
grant execute on function public.search_tcds(text,integer) to anon, authenticated, service_role;
