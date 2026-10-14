create or replace view public.source_change_feed with(security_invoker=true) as
select e.id,e.detected_at,e.kind,e.models,e.changed_fields,e.old_source_status,e.new_source_status,d.document_type,d.document_number,
  e.old_version_id,e.new_version_id,ov.source_url as old_source_url,nv.source_url as new_source_url,
  ov.revision_label as old_revision,nv.revision_label as new_revision,
  case when ov.id is null then null else jsonb_build_object(
    'title',ov.metadata->>'title','holder',ov.metadata->>'holder','model_index',ov.metadata->>'model',
    'source_modified_at',ov.metadata->>'source_modified_at','issued_date',ov.revision_date,'metadata_fingerprint',coalesce(ov.metadata->>'metadata_sha256',substring(ov.metadata->>'metadata_storage_path' from '([a-f0-9]{64})[.]json$'))
  ) end as old_metadata,
  case when nv.id is null then null else jsonb_build_object(
    'title',nv.metadata->>'title','holder',nv.metadata->>'holder','model_index',nv.metadata->>'model',
    'source_modified_at',nv.metadata->>'source_modified_at','issued_date',nv.revision_date,'metadata_fingerprint',coalesce(nv.metadata->>'metadata_sha256',substring(nv.metadata->>'metadata_storage_path' from '([a-f0-9]{64})[.]json$'))
  ) end as new_metadata
from public.source_change_events e left join public.document_versions ov on ov.id=e.old_version_id
left join public.document_versions nv on nv.id=e.new_version_id join public.documents d on d.id=coalesce(nv.document_id,ov.document_id);
