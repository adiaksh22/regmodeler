-- Page-reviewed promotion is pinned to the exact current FAA original.
create function public.review_boeing_revision83() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare evidence uuid; tcds_id uuid; family_id uuid; certificate_id uuid; model_id uuid; engine_id uuid; model_name text; target_id uuid; kind text; path_count integer;
 item jsonb; fact jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('review-boeing-737-family',0));
 select v.id,d.id into evidence,tcds_id from public.documents d join public.document_versions v on v.id=d.current_version_id
 where d.authority='FAA' and d.document_type='TCDS' and d.document_number='A16WE' and d.is_published and v.is_published
  and v.status='current' and v.revision_label='83' and v.revision_date='2026-11-13'
  and v.source_url='https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID135416911620261112223011.0001' and v.content_sha256='fb4cc665cc769a767e9b6f3b02afd0b84922b257130b51f0a28a256615b655a9'
  and v.storage_path='FAA/TCDS/A16WE/fb4cc665cc769a767e9b6f3b02afd0b84922b257130b51f0a28a256615b655a9.pdf'
  and v.metadata->'model_list' @> '["737-10","737-100 Series","737-200 Series","737-200C Series","737-300 Series","737-400 Series","737-500 Series","737-600 Series","737-7","737-700 Series","737-700C Series","737-8","737-800 Series","737-8200","737-9","737-900 Series","737-900ER Series"]'::jsonb and jsonb_array_length(v.metadata->'model_list')=17;
 if evidence is null then raise exception 'Reviewed A16WE Revision 83 original missing';end if;
 select id into family_id from public.catalog_entities where authority='BOEING' and entity_type='aircraft_family' and natural_key='BOEING:737' and is_published;
 select id into certificate_id from public.catalog_entities where authority='FAA' and entity_type='certificate' and natural_key='TCDS:A16WE' and is_published;
 if family_id is null or certificate_id is null then raise exception 'Reviewed family identities missing';end if;
 for item in select value from jsonb_array_elements($variants$[{"key":"737-700 Series","display":"737-700","market":"737 Next Generation","approved":"1997-11-07","profile_page":21,"engine":"CFM56-7B","engine_page":21,"mtow":154500,"weight_page":23,"passengers":149,"limits_page":32,"airspeed_page":23},{"key":"737-800 Series","display":"737-800","market":"737 Next Generation","approved":"1998-03-13","profile_page":21,"engine":"CFM56-7B","engine_page":21,"mtow":174200,"weight_page":24,"passengers":189,"limits_page":32,"airspeed_page":23},{"key":"737-900ER Series","display":"737-900ER","market":"737 Next Generation","approved":"2007-04-20","profile_page":59,"engine":"CFM56-7B","engine_page":59,"mtow":187700,"weight_page":59,"passengers":220,"limits_page":60,"airspeed_page":59,"passenger_condition":"220 passengers requires the mid-cabin emergency door activated and rated as a Type I exit; other listed configurations are limited to 189 or 215."},{"key":"737-8","display":"737 MAX 8","market":"737 MAX","approved":"2017-03-08","profile_page":67,"engine":"LEAP-1B","engine_page":67,"mtow":182200,"weight_page":67,"passengers":189,"limits_page":68,"airspeed_page":67},{"key":"737-9","display":"737 MAX 9","market":"737 MAX","approved":"2018-02-15","profile_page":67,"engine":"LEAP-1B","engine_page":67,"mtow":194700,"weight_page":67,"passengers":220,"limits_page":68,"airspeed_page":67,"passenger_condition":"220 passengers requires the mid-cabin emergency door activated and rated as a Type I exit; other listed configurations are limited to 189 or 215."},{"key":"737-7","display":"737 MAX 7","market":"737 MAX","approved":"2026-08-03","profile_page":67,"engine":"LEAP-1B","engine_page":67,"mtow":177000,"weight_page":67,"passengers":179,"limits_page":68,"airspeed_page":67,"passenger_condition":"179 passengers requires both automatic-overwing-exit pairs active; deactivating either pair limits capacity to 145."},{"key":"737-10","display":"737 MAX 10","market":"737 MAX","approved":"2026-10-20","profile_page":67,"engine":"LEAP-1B","engine_page":67,"mtow":197900,"weight_page":67,"passengers":230,"limits_page":68,"airspeed_page":67,"passenger_condition":"230 passengers requires the mid-cabin emergency door activated and rated as a Type C exit. Other listed configurations allow 189 with the door deactivated, 210 with a Type III exit and attendant station, 215 with Type II, or 220 with Type I."}]$variants$::jsonb) loop
  select id into model_id from public.catalog_entities where authority='FAA' and entity_type='aircraft_model' and natural_key=item->>'key' and is_published;
  if model_id is null then raise exception 'Reviewed current model missing';end if;
  insert into public.aircraft_variant_profiles(entity_id,family_entity_id,tcds_document_id,evidence_version_id,display_name,market_name,faa_status,approved_on,evidence_page,evidence_excerpt,is_published)
  values(model_id,family_id,tcds_id,evidence,item->>'display',item->>'market','faa_approved',(item->>'approved')::date,(item->>'profile_page')::integer,
   'A16WE Revision 83 identifies Model '||(item->>'key')||' as approved '||(item->>'approved')||'. Evidence is limited to the cited model section.',true)
  on conflict(entity_id) do update set evidence_version_id=excluded.evidence_version_id,display_name=excluded.display_name,market_name=excluded.market_name,faa_status=excluded.faa_status,approved_on=excluded.approved_on,evidence_page=excluded.evidence_page,evidence_excerpt=excluded.evidence_excerpt,is_published=true;
  select id into engine_id from public.catalog_entities where authority='CFM-INTERNATIONAL' and entity_type='engine_model' and natural_key='CFM:'||(item->>'engine') and is_published;
  if engine_id is null then raise exception 'Reviewed engine identity missing';end if;
  with candidates(target,kind,page,excerpt,conditions) as (values
   (certificate_id,'covered_by',(item->>'profile_page')::integer,'A16WE Revision 83 identifies Model '||(item->>'key')||' with approval date '||(item->>'approved')||'.','{"scope":"Model certification evidence; individual aircraft configuration is not established."}'::jsonb),
   (family_id,'member_of',(item->>'profile_page')::integer,'The reviewed A16WE model section places this model within the Boeing 737 family.',jsonb_build_object('market_family',item->>'market')),
   (engine_id,'powered_by',(item->>'engine_page')::integer,'The cited model section specifies two '||(item->>'engine')||' series turbofan engines; eligible configurations remain model-specific.',
    '{"configuration":"Check the exact engine configuration against the cited TCDS section and approved flight manual."}'::jsonb)
  ), refreshed as (
   update public.relationships r set evidence_page=c.page,evidence_excerpt=c.excerpt,applicability_conditions=c.conditions,review_status='reviewed',is_published=true
   from candidates c where r.source_entity_id=model_id and r.target_entity_id=c.target and r.relationship_type=c.kind and r.evidence_version_id=evidence returning r.id
  ) insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
  select model_id,c.target,c.kind,evidence,c.page,c.excerpt,c.conditions,'reviewed',true from candidates c
  where not exists(select 1 from public.relationships r where r.source_entity_id=model_id and r.target_entity_id=c.target and r.relationship_type=c.kind and r.evidence_version_id=evidence);
  for fact in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_build_object('type','engine_family','text',item->>'engine','page',(item->>'engine_page')::integer,'excerpt','The model section identifies the engine family; exact engine configurations require the listed model-specific limits.'),
   jsonb_build_object('type','maximum_takeoff_weight','number',(item->>'mtow')::numeric,'unit','lb','page',(item->>'weight_page')::integer,'excerpt','The model maximum-weights table lists this takeoff weight for the cited base configuration.'),
   jsonb_build_object('type','maximum_passengers','number',(item->>'passengers')::numeric,'unit','seats','page',(item->>'limits_page')::integer,'excerpt','The airframe-limits table lists this passenger maximum, subject to the recorded exit configuration.'),
   jsonb_build_object('type','maximum_operating_altitude','number',41000,'unit','ft','page',(item->>'limits_page')::integer,'excerpt','The model airframe-limits table specifies a 41,000-foot maximum operating altitude.'),
   jsonb_build_object('type','minimum_crew','number',2,'unit','people','page',(item->>'limits_page')::integer,'excerpt','The model airframe-limits table specifies pilot and copilot for all flights.'),
   jsonb_build_object('type','vmo','number',340,'unit','KCAS','page',(item->>'airspeed_page')::integer,'excerpt','The cited model airspeed limits specify VMO 340 KCAS.'),
   jsonb_build_object('type','mmo','number',0.82,'unit','Mach','page',(item->>'airspeed_page')::integer,'excerpt','The cited model airspeed limits specify MMO Mach 0.82.')
  )) loop
   insert into public.aircraft_variant_facts(variant_entity_id,fact_type,numeric_value,text_value,unit,conditions,evidence_version_id,evidence_page,evidence_excerpt,is_published)
   values(model_id,fact->>'type',case when fact ? 'number' then (fact->>'number')::numeric end,fact->>'text',fact->>'unit',
    case when fact->>'type'='maximum_passengers' and item ? 'passenger_condition' then jsonb_build_object('configuration',item->>'passenger_condition')
     when fact->>'type'='maximum_takeoff_weight' then '{"configuration":"Cited base model weight; modified and increased-gross-weight configurations require separate review."}'::jsonb else '{}'::jsonb end,
    evidence,(fact->>'page')::integer,fact->>'excerpt',true)
   on conflict(variant_entity_id,fact_type,evidence_version_id) do update set numeric_value=excluded.numeric_value,text_value=excluded.text_value,unit=excluded.unit,conditions=excluded.conditions,evidence_page=excluded.evidence_page,evidence_excerpt=excluded.evidence_excerpt,is_published=true;
  end loop;
 end loop;
 -- Preserve the old project's evidence, but remove its obsolete current notice.
 update public.aircraft_variant_profiles p set is_published=false from public.catalog_entities e
 where e.id=p.entity_id and e.authority='BOEING' and e.entity_type='certification_project' and e.natural_key='BOEING:737-10';
 for model_name in select jsonb_array_elements_text(metadata->'model_list') from public.document_versions where id=evidence loop
  select id into model_id from public.catalog_entities where authority='FAA' and entity_type='aircraft_model' and natural_key=model_name and is_published;
  if model_id is null then raise exception 'Imported model identity missing';end if;
  foreach kind in array array['member_of','covered_by'] loop
   target_id:=case kind when 'member_of' then family_id else certificate_id end;
   -- Preserve model-section citations already reviewed in greater detail.
   if not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=target_id and relationship_type=kind and evidence_version_id=evidence) then
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
    values(model_id,target_id,kind,evidence,1,
     'The model listing on physical PDF page 1 of A16WE Revision 83 includes '||model_name||' under Boeing Type Certificate A16WE.',
     '{"scope":"Reviewed model listing and type-certificate identity only. Technical specifications, individual-aircraft configuration and AD/STC applicability require separate review."}'::jsonb,'reviewed',true);
   end if;
  end loop;
 end loop;
 select count(*)::integer into path_count from public.relationships where evidence_version_id=evidence and review_status='reviewed' and is_published
  and ((relationship_type='member_of' and target_entity_id=family_id) or (relationship_type='covered_by' and target_entity_id=certificate_id) or relationship_type='powered_by');
 if path_count<>41 then raise exception 'Reviewed Revision 83 path inventory mismatch';end if;
 return path_count;
end $$;
revoke all on function public.review_boeing_revision83() from public,anon,authenticated;
grant execute on function public.review_boeing_revision83() to service_role;

