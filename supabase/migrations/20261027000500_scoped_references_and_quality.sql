-- A referenced maintenance document may be model-specific even when its parent STC is shared.
create table public.relationship_model_scopes (
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  model_entity_id uuid not null references public.aircraft_variant_profiles(entity_id) on delete restrict,
  primary key(relationship_id,model_entity_id)
);
alter table public.relationship_model_scopes enable row level security;
revoke all on public.relationship_model_scopes from anon,authenticated;
grant select on public.relationship_model_scopes to anon,authenticated;
grant all on public.relationship_model_scopes to service_role;
-- Scope IDs are public structural metadata. Keeping them visible prevents a hidden scope from widening a path.
create policy relationship_model_scopes_public on public.relationship_model_scopes for select to anon,authenticated using(true);

create or replace view public.model_graph with(security_invoker=true) as
select r.id,d.document_number as tcds_number,names.model as model,t.label as target,t.entity_type as target_type,
  r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label as evidence_revision,v.source_url,
  d.document_number as source_document_number,d.document_type as source_document_type,t.natural_key as basis_key,
  null::text as path_via,'outgoing'::text as direction,v.id as evidence_version_id,
  s.id as source_entity_id,t.id as target_entity_id,s.id as model_entity_id,null::uuid as via_entity_id,r.evidence_attachment_id,a.file_name as evidence_file_name,v.metadata->>'original_source_url' as original_source_url
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
join public.aircraft_model_names names on names.entity_id=s.id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and s.entity_type='aircraft_model' and d.authority='FAA' and d.document_type='TCDS' and v.id=d.current_version_id and (r.evidence_attachment_id is null or a.is_active)
union all
select r.id,cs.tcds_number,names.model,s.label,s.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,s.natural_key,null::text,'incoming'::text,v.id,s.id,t.id,t.id,null::uuid,r.evidence_attachment_id,a.file_name,v.metadata->>'original_source_url'
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.model_certificate_scope cs on cs.model_entity_id=t.id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
join public.aircraft_model_names names on names.entity_id=t.id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and t.entity_type='aircraft_model' and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current' and (r.evidence_attachment_id is null or a.is_active)
  and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model=names.model and m.is_active)
union all
select r.id,cs.tcds_number,names.model,t.label,t.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,t.natural_key,s.label,'outgoing'::text,v.id,s.id,t.id,m.id,s.id,r.evidence_attachment_id,a.file_name,v.metadata->>'original_source_url'
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
join public.relationships scope on scope.source_entity_id=s.id and scope.evidence_version_id=v.id and scope.relationship_type in('applies_to','approved_for')
join public.catalog_entities m on m.id=scope.target_entity_id and m.entity_type='aircraft_model'
join public.model_certificate_scope cs on cs.model_entity_id=m.id
join public.aircraft_model_names names on names.entity_id=m.id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and scope.review_status='reviewed' and scope.is_published and m.is_published and r.relationship_type in('affects_component','references','supersedes') and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current' and (r.evidence_attachment_id is null or a.is_active)
  and (scope.evidence_attachment_id is null or exists(select 1 from public.source_attachments sa where sa.id=scope.evidence_attachment_id and sa.is_active))
  and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.model=names.model and active.is_active)
  and (not exists(select 1 from public.relationship_model_scopes rs where rs.relationship_id=r.id)
    or exists(select 1 from public.relationship_model_scopes rs where rs.relationship_id=r.id and rs.model_entity_id=m.id));

create table public.source_quality_findings (
  version_id uuid not null references public.document_versions(id) on delete restrict,
  kind text not null check(kind in('incomplete_original','identity_mismatch')),
  summary text not null check(length(btrim(summary)) between 1 and 2000),
  reviewed_record_version_id uuid not null references public.document_versions(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  primary key(version_id,kind),
  check(version_id<>reviewed_record_version_id)
);
alter table public.source_quality_findings enable row level security;
revoke all on public.source_quality_findings from anon,authenticated;
grant all on public.source_quality_findings to service_role;

-- Return only curated public findings and a still-current, reviewed alternative for this model.
create function public.source_quality_details(p_version uuid,p_model text)
returns table(kind text,summary text,reviewed_record_number text,reviewed_record_url text,reviewed_version_id uuid,reviewed_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
select f.kind,f.summary,alt.document_number,alt.source_url,alt.id,f.reviewed_at
from public.source_quality_findings f
join public.document_versions original on original.id=f.version_id
join public.documents original_doc on original_doc.id=original.document_id
left join lateral (
  select v.id,d.document_number,v.source_url
  from public.document_versions v join public.documents d on d.id=v.document_id
  where v.id=f.reviewed_record_version_id and v.is_published and d.is_published and v.status='current'
    and exists(select 1 from public.model_graph g where g.evidence_version_id=v.id and g.model=p_model and g.path_via is null)
) alt on true
where f.version_id=p_version and original.is_published and original_doc.is_published
  and exists(select 1 from public.related_document_matches m where m.version_id=original.id and m.model=p_model)
order by f.kind limit 10
$$;
revoke all on function public.source_quality_details(uuid,text) from public;
grant execute on function public.source_quality_details(uuid,text) to anon,authenticated,service_role;

