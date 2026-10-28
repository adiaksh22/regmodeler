-- Resolve published model aliases through stable entity IDs, without rewriting FAA source identities.
create view public.aircraft_model_names with(security_invoker=true) as
select e.id as entity_id,coalesce(min(m.model),e.label) as model
from public.catalog_entities e
left join public.related_scope_models m on m.model_entity_id=e.id
where e.entity_type='aircraft_model' and e.is_published
group by e.id,e.label;
grant select on public.aircraft_model_names to anon,authenticated,service_role;

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
  and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.model=names.model and active.is_active);
