create function public.review_boeing_737_family() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare evidence uuid; tcds_id uuid; family_id uuid; certificate_id uuid; model_id uuid; engine_id uuid; project_id uuid;
  item jsonb; fact jsonb; relation_id uuid; v_rule_set_id uuid; v_group_id uuid; model_name text; connection_count integer:=0;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-boeing-737-family',0));
  select v.id,d.id into evidence,tcds_id from public.documents d join public.document_versions v on v.id=d.current_version_id
    where d.authority='FAA' and d.document_type='TCDS' and d.document_number='A16WE' and d.is_published and v.is_published
      and v.status='current' and v.revision_label='81' and v.revision_date='2026-08-03'
      and v.content_sha256='4a88ab57064783a155640b3eae4cbb812bb43596cce403f757c3d77be3f84e48'
      and v.metadata->'model_list' @> '["737-700 Series","737-800 Series","737-900ER Series","737-8","737-9","737-7"]'::jsonb
      and not(v.metadata->'model_list' @> '["737-10"]'::jsonb);
  if evidence is null then raise exception 'Reviewed A16WE Revision 81 original missing'; end if;

  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
    values('BOEING','aircraft_family','BOEING:737','Boeing 737 family',true)
    on conflict(authority,entity_type,natural_key) do update set label=excluded.label,is_published=true returning id into family_id;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
    values('FAA','certificate','TCDS:A16WE','Type certificate A16WE',true)
    on conflict(authority,entity_type,natural_key) do update set label=excluded.label,is_published=true returning id into certificate_id;

  for item in select value from jsonb_array_elements($variants$[
    {"key":"737-700 Series","display":"737-700","market":"737 Next Generation","approved":"1997-11-07","profile_page":21,"profile_excerpt":"Section VII identifies Model 737-700, approved November 7, 1997, as a transport aircraft.","engine":"CFM56-7B","engine_page":21,"mtow":154500,"weight_page":23,"passengers":149,"limits_page":32,"airspeed_page":23},
    {"key":"737-800 Series","display":"737-800","market":"737 Next Generation","approved":"1998-03-13","profile_page":21,"profile_excerpt":"Section VII identifies Model 737-800, approved March 13, 1998, as a transport aircraft.","engine":"CFM56-7B","engine_page":21,"mtow":174200,"weight_page":24,"passengers":189,"limits_page":32,"airspeed_page":23},
    {"key":"737-900ER Series","display":"737-900ER","market":"737 Next Generation","approved":"2007-04-20","profile_page":59,"profile_excerpt":"Section X identifies Model 737-900ER, approved April 20, 2007, as a transport aircraft.","engine":"CFM56-7B","engine_page":59,"mtow":187700,"weight_page":59,"passengers":220,"limits_page":60,"airspeed_page":59,"passenger_condition":"220 seats requires the mid-cabin emergency door activated and rated as a Type I exit; other configurations are limited to 189 or 215."},
    {"key":"737-8","display":"737 MAX 8","market":"737 MAX","approved":"2017-03-08","profile_page":66,"profile_excerpt":"Section XI identifies Model 737-8, approved March 8, 2017, as a transport aircraft.","engine":"LEAP-1B","engine_page":66,"mtow":182200,"weight_page":67,"passengers":189,"limits_page":67,"airspeed_page":67},
    {"key":"737-9","display":"737 MAX 9","market":"737 MAX","approved":"2018-02-15","profile_page":66,"profile_excerpt":"Section XI identifies Model 737-9, approved February 15, 2018, as a transport aircraft.","engine":"LEAP-1B","engine_page":66,"mtow":194700,"weight_page":67,"passengers":220,"limits_page":67,"airspeed_page":67,"passenger_condition":"220 seats requires the mid-cabin emergency door activated and rated as a Type I exit; other configurations are limited to 189 or 215."},
    {"key":"737-7","display":"737 MAX 7","market":"737 MAX","approved":"2026-08-03","profile_page":66,"profile_excerpt":"Section XI identifies Model 737-7 with an approval date of August 3, 2026, as a transport aircraft.","engine":"LEAP-1B","engine_page":66,"mtow":177000,"weight_page":67,"passengers":179,"limits_page":67,"airspeed_page":67,"passenger_condition":"179 seats requires both automatic-overwing-exit pairs active; deactivating either pair limits capacity to 145."}
  ]$variants$::jsonb) loop
    model_name:=item->>'key';
    select id into model_id from public.catalog_entities where authority='FAA' and entity_type='aircraft_model' and natural_key=model_name;
    if model_id is null then raise exception 'Imported current model missing: %',model_name; end if;
    insert into public.aircraft_variant_profiles(entity_id,family_entity_id,tcds_document_id,evidence_version_id,display_name,market_name,faa_status,approved_on,evidence_page,evidence_excerpt,is_published)
      values(model_id,family_id,tcds_id,evidence,item->>'display',item->>'market','faa_approved',(item->>'approved')::date,(item->>'profile_page')::integer,item->>'profile_excerpt',true)
      on conflict(entity_id) do update set family_entity_id=excluded.family_entity_id,tcds_document_id=excluded.tcds_document_id,evidence_version_id=excluded.evidence_version_id,display_name=excluded.display_name,market_name=excluded.market_name,faa_status=excluded.faa_status,approved_on=excluded.approved_on,evidence_page=excluded.evidence_page,evidence_excerpt=excluded.evidence_excerpt,is_published=true;

    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
      select model_id,certificate_id,'covered_by',evidence,(item->>'profile_page')::integer,item->>'profile_excerpt',jsonb_build_object('faa_status','FAA approved in A16WE Revision 81'),'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=certificate_id and relationship_type='covered_by' and evidence_version_id=evidence);
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
      select model_id,family_id,'member_of',evidence,(item->>'profile_page')::integer,item->>'profile_excerpt',jsonb_build_object('market_family',item->>'market'),'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=family_id and relationship_type='member_of' and evidence_version_id=evidence);
    insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
      values(case item->>'engine' when 'CFM56-7B' then 'CFM-INTERNATIONAL' else 'CFM-INTERNATIONAL' end,'engine_model','CFM:'||(item->>'engine'),item->>'engine'||' engine family',true)
      on conflict(authority,entity_type,natural_key) do update set label=excluded.label,is_published=true returning id into engine_id;
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
      select model_id,engine_id,'powered_by',evidence,(item->>'engine_page')::integer,
        case item->>'engine' when 'CFM56-7B' then 'The model section specifies two CFM International CFM56-7B series turbofan engines, subject to the listed model/configuration limits.' else 'Section XI specifies two CFM International LEAP-1B series turbofan engines and lists eligible engine configurations by model.' end,
        jsonb_build_object('configuration','Exact engine model and approved configuration must be checked against the TCDS and aircraft records.'),'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=engine_id and relationship_type='powered_by' and evidence_version_id=evidence);
    connection_count:=connection_count+3;

    for fact in select value from jsonb_array_elements(jsonb_build_array(
      jsonb_build_object('type','engine_family','text',item->>'engine','page',(item->>'engine_page')::integer,'excerpt','The FAA model section identifies the approved engine family; exact engine configurations remain model-specific.'),
      jsonb_build_object('type','maximum_takeoff_weight','number',(item->>'mtow')::numeric,'unit','lb','page',(item->>'weight_page')::integer,'excerpt','The FAA TCDS maximum-weights table lists this maximum takeoff weight for the base model configuration.'),
      jsonb_build_object('type','maximum_passengers','number',(item->>'passengers')::numeric,'unit','seats','page',(item->>'limits_page')::integer,'excerpt','The FAA TCDS airframe-limits table lists this maximum passenger capacity, subject to the recorded exit-configuration condition.'),
      jsonb_build_object('type','maximum_operating_altitude','number',41000,'unit','ft','page',(item->>'limits_page')::integer,'excerpt','The FAA TCDS airframe-limits table lists a maximum operating altitude of 41,000 feet.'),
      jsonb_build_object('type','minimum_crew','number',2,'unit','people','page',(item->>'limits_page')::integer,'excerpt','The FAA TCDS airframe-limits table specifies pilot and copilot for all flights.'),
      jsonb_build_object('type','vmo','number',340,'unit','KCAS','page',(item->>'airspeed_page')::integer,'excerpt','The FAA TCDS lists VMO as 340 KCAS.'),
      jsonb_build_object('type','mmo','number',0.82,'unit','Mach','page',(item->>'airspeed_page')::integer,'excerpt','The FAA TCDS lists MMO as Mach 0.82.')
    )) loop
      insert into public.aircraft_variant_facts(variant_entity_id,fact_type,numeric_value,text_value,unit,conditions,evidence_version_id,evidence_page,evidence_excerpt,is_published)
      values(model_id,fact->>'type',case when fact ? 'number' then (fact->>'number')::numeric end,fact->>'text',fact->>'unit',
        case when fact->>'type'='maximum_passengers' and item ? 'passenger_condition' then jsonb_build_object('configuration',item->>'passenger_condition') else '{}'::jsonb end,
        evidence,(fact->>'page')::integer,fact->>'excerpt',true)
      on conflict(variant_entity_id,fact_type,evidence_version_id) do update set numeric_value=excluded.numeric_value,text_value=excluded.text_value,unit=excluded.unit,conditions=excluded.conditions,evidence_page=excluded.evidence_page,evidence_excerpt=excluded.evidence_excerpt,is_published=true;
    end loop;
  end loop;

  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
    values('BOEING','certification_project','BOEING:737-10','737 MAX 10',true)
    on conflict(authority,entity_type,natural_key) do update set label=excluded.label,is_published=true returning id into project_id;
  insert into public.aircraft_variant_profiles(entity_id,family_entity_id,tcds_document_id,evidence_version_id,display_name,market_name,faa_status,approved_on,evidence_page,evidence_excerpt,is_published)
    values(project_id,family_id,tcds_id,evidence,'737 MAX 10','737 MAX','not_listed_in_current_tcds',null,1,
      'The model list on the cover of current FAA TCDS A16WE Revision 81 includes 737-7, 737-8, 737-9 and 737-8200, but it does not list 737-10.',true)
    on conflict(entity_id) do update set evidence_version_id=excluded.evidence_version_id,evidence_page=excluded.evidence_page,evidence_excerpt=excluded.evidence_excerpt,faa_status=excluded.faa_status,approved_on=null,is_published=true;
  insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
    select project_id,family_id,'project_for',evidence,1,'737 MAX 10 is retained as a Boeing 737 family certification project and is not listed as an approved model in current FAA TCDS A16WE Revision 81.',
      jsonb_build_object('faa_status','Not listed in current A16WE Revision 81; do not treat as FAA type-certificated.'),'reviewed',true
    where not exists(select 1 from public.relationships where source_entity_id=project_id and target_entity_id=family_id and relationship_type='project_for' and evidence_version_id=evidence);

  -- Encode the two alternative AD 2022-03-15 applicability branches as AND groups under one OR rule set.
  for relation_id in select r.id from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id
    join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
    where s.natural_key='AD:2022-03-15' and r.relationship_type='applies_to' and d.document_number='2022-03-15' and v.status='current' loop
    insert into public.applicability_rule_sets(relationship_id,evidence_version_id,label,outcome,is_published)
      values(relation_id,(select evidence_version_id from public.relationships where id=relation_id),'G3X Touch or GI 275 fuel-quantity configuration','requires_review',true)
      on conflict(relationship_id) do update set label=excluded.label,outcome=excluded.outcome,is_published=true returning id into v_rule_set_id;
    delete from public.applicability_rule_groups where rule_set_id=v_rule_set_id;
    insert into public.applicability_rule_groups(rule_set_id,group_order,match_operator,label) values(v_rule_set_id,1,'all','G3X Touch path') returning id into v_group_id;
    insert into public.applicability_predicates(group_id,predicate_order,subject_kind,subject_key,comparison,expected,evidence_page,evidence_excerpt) values
      (v_group_id,1,'installed_equipment','GARMIN:G3X-TOUCH','present','true',3,'Paragraph (c)(1) requires a Garmin G3X Touch display.'),
      (v_group_id,2,'stc','SA01899WI','present','true',3,'Paragraph (c)(1) requires installation under STC SA01899WI.'),
      (v_group_id,3,'drawing_revision','005-01320-00','at_or_before','9',3,'Paragraph (c)(1) limits the Master Drawing List to Revision 9 or earlier.'),
      (v_group_id,4,'installed_equipment','GARMIN:GEA24-RESISTIVE-FUEL','present','true',3,'The display must interface through a GEA 24 to resistive fuel probes.');
    insert into public.applicability_rule_groups(rule_set_id,group_order,match_operator,label) values(v_rule_set_id,2,'all','GI 275 path') returning id into v_group_id;
    insert into public.applicability_predicates(group_id,predicate_order,subject_kind,subject_key,comparison,expected,evidence_page,evidence_excerpt) values
      (v_group_id,1,'installed_equipment','GARMIN:GI275-MFD','present','true',3,'Paragraph (c)(2) requires a Garmin GI 275 MFD.'),
      (v_group_id,2,'stc','SA02658SE','present','true',3,'Paragraph (c)(2) requires installation under STC SA02658SE.'),
      (v_group_id,3,'drawing_revision','005-01280-00','at_or_before','9',3,'Paragraph (c)(2) limits the Master Drawing List to Revision 9 or earlier.'),
      (v_group_id,4,'installed_equipment','GARMIN:GEA24-RESISTIVE-FUEL','present','true',3,'The display must interface through a GEA 24 to resistive fuel probes.');
  end loop;
  return connection_count+1;
end $$;
revoke all on function public.review_boeing_737_family() from public,anon,authenticated;
grant execute on function public.review_boeing_737_family() to service_role;

create or replace view public.model_certificate_scope with(security_invoker=true) as
select distinct r.source_entity_id as model_entity_id,d.document_number as tcds_number
from public.relationships r join public.catalog_entities m on m.id=r.source_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id
where m.entity_type='aircraft_model' and r.relationship_type='covered_by' and r.review_status='reviewed' and r.is_published
  and m.is_published and d.authority='FAA' and d.document_type='TCDS' and d.is_published and v.is_published;
grant select on public.model_certificate_scope to anon,authenticated,service_role;

create or replace view public.model_graph with(security_invoker=true) as
select r.id,d.document_number as tcds_number,s.label as model,t.label as target,t.entity_type as target_type,
  r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label as evidence_revision,v.source_url,
  d.document_number as source_document_number,d.document_type as source_document_type,t.natural_key as basis_key,
  null::text as path_via,'outgoing'::text as direction,v.id as evidence_version_id,
  s.id as source_entity_id,t.id as target_entity_id,s.id as model_entity_id,null::uuid as via_entity_id,r.evidence_attachment_id,a.file_name as evidence_file_name,v.metadata->>'original_source_url' as original_source_url
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and s.entity_type='aircraft_model' and d.authority='FAA' and d.document_type='TCDS' and v.id=d.current_version_id and (r.evidence_attachment_id is null or a.is_active)
union all
select r.id,cs.tcds_number,t.label,s.label,s.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,s.natural_key,null::text,'incoming'::text,v.id,s.id,t.id,t.id,null::uuid,r.evidence_attachment_id,a.file_name,v.metadata->>'original_source_url'
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.model_certificate_scope cs on cs.model_entity_id=t.id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and t.entity_type='aircraft_model' and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current' and (r.evidence_attachment_id is null or a.is_active)
  and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model=t.label and m.is_active)
union all
select r.id,cs.tcds_number,m.label,t.label,t.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,t.natural_key,s.label,'outgoing'::text,v.id,s.id,t.id,m.id,s.id,r.evidence_attachment_id,a.file_name,v.metadata->>'original_source_url'
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
join public.relationships scope on scope.source_entity_id=s.id and scope.evidence_version_id=v.id and scope.relationship_type in('applies_to','approved_for')
join public.catalog_entities m on m.id=scope.target_entity_id and m.entity_type='aircraft_model'
join public.model_certificate_scope cs on cs.model_entity_id=m.id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and scope.review_status='reviewed' and scope.is_published and m.is_published and r.relationship_type in('affects_component','references','supersedes') and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current' and (r.evidence_attachment_id is null or a.is_active)
  and (scope.evidence_attachment_id is null or exists(select 1 from public.source_attachments sa where sa.id=scope.evidence_attachment_id and sa.is_active))
  and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.model=m.label and active.is_active);
