create or replace view public.model_graph with(security_invoker=true) as
select r.id,d.document_number as tcds_number,s.label as model,t.label as target,t.entity_type as target_type,
  r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label as evidence_revision,v.source_url,
  d.document_number as source_document_number,d.document_type as source_document_type,t.natural_key as basis_key,
  null::text as path_via,'outgoing'::text as direction,v.id as evidence_version_id
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
where s.entity_type='aircraft_model' and d.authority='FAA' and d.document_type='TCDS' and v.id=d.current_version_id
union all
select r.id,'2A13',t.label,s.label,s.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,s.natural_key,null::text,'incoming'::text,v.id
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
where t.entity_type='aircraft_model' and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current'
  and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model=t.label and m.is_active)
union all
select r.id,'2A13',m.label,t.label,t.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,t.natural_key,s.label,'outgoing'::text,v.id
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
join public.relationships scope on scope.source_entity_id=s.id and scope.evidence_version_id=v.id and scope.relationship_type='applies_to'
join public.catalog_entities m on m.id=scope.target_entity_id and m.entity_type='aircraft_model'
where r.relationship_type='references' and d.authority='FAA' and d.document_type='AD' and v.status='current'
  and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.model=m.label and active.is_active);
grant select on public.model_graph to anon,authenticated,service_role;
