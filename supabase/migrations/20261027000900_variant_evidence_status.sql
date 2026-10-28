-- Historical reviewed facts remain useful, but must not claim current-source status.
create or replace view public.aircraft_variant_catalog with(security_invoker=true) as
select p.entity_id,p.family_entity_id,p.tcds_document_id,d.document_number as tcds_number,e.natural_key as model_key,p.display_name,p.market_name,p.faa_status,
  p.approved_on::text,p.evidence_version_id,p.evidence_page,p.evidence_excerpt,
  coalesce(jsonb_object_agg(f.fact_type,jsonb_build_object('numeric_value',f.numeric_value,'text_value',f.text_value,'unit',f.unit,'conditions',f.conditions,'evidence_page',f.evidence_page,'evidence_excerpt',f.evidence_excerpt)) filter(where f.id is not null),'{}'::jsonb) as facts,
  v.revision_label as evidence_revision,coalesce(v.id=d.current_version_id and v.status='current',false) as evidence_is_current
from public.aircraft_variant_profiles p join public.documents d on d.id=p.tcds_document_id join public.catalog_entities e on e.id=p.entity_id
join public.document_versions v on v.id=p.evidence_version_id
left join public.aircraft_variant_facts f on f.variant_entity_id=p.entity_id and f.is_published
where p.is_published group by p.entity_id,p.family_entity_id,p.tcds_document_id,d.document_number,e.natural_key,p.display_name,p.market_name,p.faa_status,p.approved_on,p.evidence_version_id,p.evidence_page,p.evidence_excerpt,v.revision_label,v.id,d.current_version_id,v.status;
