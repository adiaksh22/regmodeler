alter table public.catalog_entities drop constraint catalog_entities_entity_type_check;
alter table public.catalog_entities add constraint catalog_entities_entity_type_check check(entity_type in
  ('aircraft_model','engine_model','propeller_model','appliance_model','certificate','regulatory_provision','organization','service_document'));

create function public.attach_source_original(p_version_id uuid,p_hash text,p_path text,p_material jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare old_hash text; doc_type text;
begin
  select v.content_sha256,d.document_type into old_hash,doc_type from public.document_versions v
    join public.documents d on d.id=v.document_id where v.id=p_version_id and d.authority='FAA' and d.document_type in('AD','STC','CAR') for update of v;
  if doc_type is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_path is distinct from 'FAA/'||doc_type||'/reviewed/'||p_hash||'.pdf' then raise exception 'Invalid original'; end if;
  if old_hash is not null and old_hash<>p_hash then raise exception 'Original bytes are immutable'; end if;
  if jsonb_typeof(p_material)<>'object' then raise exception 'Invalid material metadata'; end if;
  update public.document_versions set content_sha256=p_hash,storage_path=p_path,
    metadata=metadata||p_material||jsonb_build_object('primary_pdf_pending',false) where id=p_version_id;
end $$;
revoke all on function public.attach_source_original(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.attach_source_original(uuid,text,text,jsonb) to service_role;

create function public.review_pa28_related_graph() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare ad_version uuid; stc_version uuid; ad_id uuid; stc_id uuid; model_id uuid; service_id uuid; model_name text;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-pa28-related',0));
  select v.id into ad_version from public.document_versions v join public.documents d on d.id=v.document_id
    where d.authority='FAA' and d.document_type='AD' and d.document_number='2020-24-05' and v.is_published and d.is_published
      and v.content_sha256='56bcc802e7a5a992be7a62c9fa84c9c31cf6cbeccbf0ef93584a73ab9c64652d'
      and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model='PA-28-140' and m.is_active)
      and v.status='current' limit 1;
  select v.id into stc_version from public.document_versions v join public.documents d on d.id=v.document_id
    where d.authority='FAA' and d.document_type='STC' and d.document_number='SA2230CE' and v.is_published and d.is_published
      and v.content_sha256='42968de3068a3da4cf72896c64d1ae06db594feb7889855d4c43d9fe71371463'
      and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.is_active) and v.status='current' limit 1;
  if ad_version is null or stc_version is null then raise exception 'Verified current originals missing'; end if;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published) values('FAA','certificate','AD:2020-24-05','AD 2020-24-05',true)
    on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into ad_id;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published) values('FAA','certificate','STC:SA2230CE','STC SA2230CE',true)
    on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into stc_id;
  for model_name in select unnest(array['PA-28-140','PA-28-181']) loop
    select id into model_id from public.catalog_entities where authority='FAA' and entity_type='aircraft_model' and natural_key=model_name;
    if model_id is null then raise exception 'Reviewed model missing'; end if;
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
      select stc_id,model_id,'approved_for',stc_version,1,
        'Original Product - Type Certificate Number: 2A13. Model: PA-28-140, -150, -160, -161, -180, -181, -235, -236; PA-28R-180, -200. Installation of replacement stabilator tips.',
        jsonb_build_object('installation','Not confirmed on an individual aircraft.','compatibility','Compatibility with previously approved modifications must be determined by the installer.','required_data','FAA-approved Horton STOL-Craft Drawing List No. 11, February 27, 1987, or later FAA-approved revision.'),'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=stc_id and target_entity_id=model_id and evidence_version_id=stc_version);
    if model_name='PA-28-140' then
      insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_section,evidence_excerpt,applicability_conditions,review_status,is_published)
        select ad_id,model_id,'applies_to',ad_version,5,'(c), Table 1',
          'PA-28-140: 28-20001 through 28-26946, and 28-7125001 through 28-7725290.',
          jsonb_build_object('serial_ranges','28-20001 through 28-26946; 28-7125001 through 28-7725290.','aircraft_scope','Model-level scope is verified. Individual-aircraft serial number and compliance status are not recorded.','effective_date','2020-12-28'),'reviewed',true
        where not exists(select 1 from public.relationships where source_entity_id=ad_id and target_entity_id=model_id and evidence_version_id=ad_version);
    end if;
  end loop;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
    values('PIPER','service_document','SB:1304A:2018-08-14','Piper SB 1304A · August 14, 2018',true)
    on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into service_id;
  insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_section,evidence_excerpt,applicability_conditions,review_status,is_published)
    select ad_id,service_id,'references',ad_version,7,'(l)(2)(i)',
      'Piper Aircraft, Inc. Service Bulletin No. 1304A, August 14, 2018.',
      jsonb_build_object('source_text','The reference is verified in the AD. The manufacturer service-bulletin text has not been retrieved.'),'reviewed',true
    where not exists(select 1 from public.relationships where source_entity_id=ad_id and target_entity_id=service_id and evidence_version_id=ad_version);
  return 4;
end $$;
revoke all on function public.review_pa28_related_graph() from public,anon,authenticated;
grant execute on function public.review_pa28_related_graph() to service_role;

create view public.model_graph with(security_invoker=true) as
select r.id,d.document_number as tcds_number,s.label as model,t.label as target,t.entity_type as target_type,
  r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label as evidence_revision,v.source_url,
  d.document_number as source_document_number,d.document_type as source_document_type,t.natural_key as basis_key,
  null::text as path_via,'outgoing'::text as direction
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
where s.entity_type='aircraft_model' and d.authority='FAA' and d.document_type='TCDS' and v.id=d.current_version_id
union all
select r.id,'2A13',t.label,s.label,s.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,s.natural_key,null::text,'incoming'::text
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
where t.entity_type='aircraft_model' and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current'
  and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model=t.label and m.is_active)
union all
select r.id,'2A13',m.label,t.label,t.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,t.natural_key,s.label,'outgoing'::text
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
join public.relationships scope on scope.source_entity_id=s.id and scope.evidence_version_id=v.id and scope.relationship_type='applies_to'
join public.catalog_entities m on m.id=scope.target_entity_id and m.entity_type='aircraft_model'
where r.relationship_type='references' and d.authority='FAA' and d.document_type='AD' and v.status='current'
  and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.model=m.label and active.is_active);
grant select on public.model_graph to anon,authenticated,service_role;
