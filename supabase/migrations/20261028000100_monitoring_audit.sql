-- The generic TCDS importer must maintain the same change-observation contract
-- as the original PA-28 importer. Reviewed graph evidence is never republished.
alter function public.commit_tcds_catalog(uuid,text,jsonb) rename to commit_tcds_catalog_core;
revoke all on function public.commit_tcds_catalog_core(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function public.commit_tcds_catalog(p_run_id uuid,p_certificate text,p_records jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare processed integer; observations jsonb;
begin
 processed:=public.commit_tcds_catalog_core(p_run_id,p_certificate,p_records);
 select jsonb_agg(jsonb_build_object('identity',item->>'source_version_id','version_id',v.id,
   'status',item->>'status','metadata_hash',substring(item->'metadata'->>'metadata_storage_path' from '([a-f0-9]{64})[.]json$'),
   'pdf_hash',item->>'content_sha256','models',(
     select jsonb_agg(coalesce((select min(m.model) from public.related_scope_models m where m.source_model=model.value),model.value))
     from jsonb_array_elements_text(item->'metadata'->'model_list') model(value)
   ))) into observations
 from jsonb_array_elements(p_records) item
 join public.documents d on d.authority='FAA' and d.document_type='TCDS' and d.document_number=p_certificate
 join public.document_versions v on v.document_id=d.id and v.source_url=item->>'source_url'
   and v.metadata->>'snapshot_sha256'=item->'metadata'->>'snapshot_sha256';
 perform public.record_source_observations('FAA:TCDSMODEL:'||p_certificate,p_run_id,observations);
 return processed;
end $$;
revoke all on function public.commit_tcds_catalog(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_tcds_catalog(uuid,text,jsonb) to service_role;

-- Establish a baseline only where imported sources lack one. Do not fabricate
-- historical change events from data collected before this monitoring repair.
do $$
declare checkpoint record; observations jsonb;
begin
 for checkpoint in select c.source,c.last_successful_run_id,d.id as document_id
   from public.ingestion_checkpoints c join public.documents d
     on c.source='FAA:TCDSMODEL:'||d.document_number and d.authority='FAA' and d.document_type='TCDS'
   where not exists(select 1 from public.source_observations o where o.source=c.source)
 loop
   select jsonb_agg(jsonb_build_object('identity',substring(v.source_url from '[^/]+$'),'version_id',v.id,
     'status',v.status,'metadata_hash',substring(v.metadata->>'metadata_storage_path' from '([a-f0-9]{64})[.]json$'),
     'pdf_hash',v.content_sha256,'models',(
       select jsonb_agg(coalesce((select min(m.model) from public.related_scope_models m where m.source_model=model.value),model.value))
       from jsonb_array_elements_text(v.metadata->'model_list') model(value)
     ))) into observations
   from public.document_versions v where v.document_id=checkpoint.document_id and v.is_published and v.content_sha256 is not null
     and jsonb_typeof(v.metadata->'model_list')='array'
     and not exists(select 1 from public.document_versions newer where newer.document_id=v.document_id and newer.source_url=v.source_url
       and (newer.retrieved_at,newer.id)>(v.retrieved_at,v.id));
   if observations is not null then perform public.record_source_observations(checkpoint.source,checkpoint.last_successful_run_id,observations); end if;
 end loop;
end $$;

create or replace function public.source_monitoring()
returns table(source text,last_success timestamptz,last_attempt timestamptz,status text,baseline_ready boolean)
language sql stable security definer set search_path=pg_catalog,public as $$
 select s.source,success.completed_at,r.started_at,r.status,
   exists(select 1 from public.source_observations o where o.source=s.source)
 from (
   select source from public.related_source_scopes where document_type in('AD','STC')
   union select 'FAA:TCDSMODEL:2A13' union select 'FAA:TCDSMODEL:A16WE'
 ) s left join public.ingestion_checkpoints c on c.source=s.source
 left join public.ingestion_runs success on success.id=c.last_successful_run_id and success.status='succeeded'
 left join lateral(select started_at,status from public.ingestion_runs where source=s.source order by started_at desc,id desc limit 1) r on true;
$$;
