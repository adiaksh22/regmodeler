create function public.review_boeing_stc_resolution() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; reference jsonb; finding jsonb; evidence uuid; source_entity uuid; model_entity uuid;
  reference_entity uuid; relation uuid; original_version uuid; alternative_version uuid; model_name text; total integer:=0;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-boeing-stc-resolution',0));
  for item in select value from jsonb_array_elements($review$[
  {
    "number":"ST04009NY","source_url":"https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID198838941920250501135110.0001",
    "hash":"bb7d2494050a277dd6ca56ac9e07653384cc95231c44f55c6a2b050a2d9bdab1","models":["737-700","737-800"],"page":1,
    "excerpt":"ST04009NY, reissued January 8, 2025, lists A16WE and 737-300/-400/-500/-600/-700/-800 Series for an ADS-B Out installation. Only supported 737-700/-800 model scope is mapped.",
    "conditions":{"configuration":"Page 1 describes dual ACSS XS-950 transponders, dual CMA-3024 WAAS/GNSS receivers, specified antenna alternatives and failure annunciators. Individual installation is not verified.","existing_system":"The existing transponder system must comply with Mode S, Mode S ELS and Mode S EHS; its control panel must provide ATC/XPDR failure indication.","compatibility_permission":"Page 3 requires installer compatibility assessment and written holder permission for use by another person.","source_identity":"This is the separate FAA ST04009NY record. It is not a correction or automatic replacement of SA04009NY.","source_completeness":"All three certificate pages were obtained; supporting design, flight-manual and maintenance documents remain unobtained."},
    "references":[
      {"authority":"AERSALE","key":"MDL:B737-MDL-0019:A:2019-06-11","label":"AerSale B737-MDL-0019 Revision A","models":["737-700","737-800"],"page":1,"excerpt":"Installation is in accordance with Master Data List B737-MDL-0019 Revision A, June 11, 2019, or later FAA-approved revisions."},
      {"authority":"AERSALE","key":"AFMS:B737-AFM-0017:IR:2019-09-04","label":"AerSale B737-AFM-0017 Revision IR","models":["737-700","737-800"],"page":1,"excerpt":"B737-AFM-0017 Revision IR, September 4, 2019, or later FAA-approved revisions is a required part of this STC."},
      {"authority":"AERSALE","key":"ICA:B737-ICA-0019:B:2019-06-11","label":"AerSale B737-ICA-0019 Revision B","models":["737-700","737-800"],"page":1,"excerpt":"For maintenance and inspections, apply B737-ICA-0019 Revision B, June 11, 2019, or later FAA-accepted revisions."}
    ]
  },
  {
    "number":"ST01635LA","source_url":"https://drs.faa.gov/browse/excelExternalWindow/70809A3F184E1A538625802F00674984.0001",
    "hash":"60fdc54d5b816ea8d85d186cdef7b37702e6303cc3f771eeedf2c9963d92403c","models":["737-700","737-800"],"page":1,
    "excerpt":"ST01635LA, amended August 18, 2016, lists A16WE and 737-700/-700C/-800/-900 Series for a Cabin Interior Noise Reduction Kit. Only supported 737-700/-800 models are mapped.",
    "conditions":{"installation":"Installer compatibility assessment is required. Individual-aircraft installation and compliance are not established.","records_permission":"A copy of the STC must be included in permanent aircraft records. Written holder permission is required for another person to use the certificate.","maintenance_scope":"Page 1 assigns different maintenance supplements to 737-700/-700C and 737-800. Follow the model-specific path.","certification_basis":"Page 3 limits its stated Part 26 basis to index list AC25-BBJ-7370 Revision J, July 30, 2012, or later FAA-approved revisions; the revision condition is preserved.","source_identity":"This separate ST01635LA record does not establish a renumbering or supersession of SA01635LA.","source_completeness":"All three certificate pages were obtained. Referenced index and maintenance documents remain unobtained."},
    "references":[
      {"authority":"AEROCON","key":"MASTER-INDEX:AC25-BBJ-7370:NC:2006-08-22","label":"Aerocon Master Index AC25-BBJ-7370 Revision NC","models":["737-700","737-800"],"page":1,"excerpt":"The design change references Index List AC25-BBJ-7370 Revision NC, August 22, 2006, or later FAA-approved revision."},
      {"authority":"AEROCON","key":"MMS:AC25-1346:NC:2006-02-18","label":"Aerocon AC25-1346 Revision NC - 737-700","models":["737-700"],"page":1,"excerpt":"For 737-700 and -700C Series, maintenance supplement AC25-1346 Revision NC, February 18, 2006, or later FAA-approved revision must be available to the operator at installation."},
      {"authority":"AEROCON","key":"MMS:AC25-1340:NC:2006-05-10","label":"Aerocon AC25-1340 Revision NC - 737-800","models":["737-800"],"page":1,"excerpt":"For 737-800 Series, maintenance supplement AC25-1340 Revision NC, May 10, 2006, or later FAA-approved revision must be available to the operator at installation."}
    ]
  }
]$review$::jsonb) loop
    select v.id into evidence from public.document_versions v join public.documents d on d.id=v.document_id
      where d.authority='FAA' and d.document_type='STC' and d.document_number=item->>'number'
        and v.source_url=item->>'source_url' and v.content_sha256=item->>'hash'
        and d.is_published and v.is_published and v.status='current'
        and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.source='FAA:STC:B737' and active.is_active)
      order by v.retrieved_at desc limit 1;
    if evidence is null then raise exception 'Verified complete STC original missing'; end if;
    insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
      values('FAA','certificate','STC:'||(item->>'number'),'STC '||(item->>'number'),true)
      on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into source_entity;
    for model_name in select jsonb_array_elements_text(item->'models') loop
      select scope.model_entity_id into model_entity from public.related_scope_models scope
        where scope.source='FAA:STC:B737' and scope.model=model_name
          and exists(select 1 from public.related_document_matches active where active.source=scope.source and active.version_id=evidence and active.model=model_name and active.is_active);
      if model_entity is null or not exists(select 1 from public.model_certificate_scope cs where cs.model_entity_id=model_entity and cs.tcds_number='A16WE') then raise exception 'Reviewed STC model or active match missing'; end if;
      insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
        select source_entity,model_entity,'approved_for',evidence,(item->>'page')::integer,item->>'excerpt',item->'conditions','reviewed',true
        where not exists(select 1 from public.relationships r where r.source_entity_id=source_entity and r.target_entity_id=model_entity and r.evidence_version_id=evidence and r.relationship_type='approved_for');
      total:=total+1;
    end loop;
    for reference in select value from jsonb_array_elements(item->'references') loop
      insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
        values(reference->>'authority','service_document',reference->>'key',reference->>'label',true)
        on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into reference_entity;
      insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
        select source_entity,reference_entity,'references',evidence,(reference->>'page')::integer,reference->>'excerpt',
          jsonb_build_object('source_text','The reference and its model scope are reviewed in the certificate; the referenced document itself has not been obtained.'),'reviewed',true
        where not exists(select 1 from public.relationships r where r.source_entity_id=source_entity and r.target_entity_id=reference_entity and r.evidence_version_id=evidence and r.relationship_type='references');
      select r.id into relation from public.relationships r where r.source_entity_id=source_entity and r.target_entity_id=reference_entity and r.evidence_version_id=evidence and r.relationship_type='references';
      delete from public.relationship_model_scopes where relationship_id=relation;
      for model_name in select jsonb_array_elements_text(reference->'models') loop
        if not(item->'models' ? model_name) then raise exception 'Reference outside reviewed model scope'; end if;
        select model_entity_id into model_entity from public.related_scope_models where source='FAA:STC:B737' and model=model_name;
        if model_entity is null then raise exception 'Reference model identity missing'; end if;
        insert into public.relationship_model_scopes(relationship_id,model_entity_id) values(relation,model_entity);
      end loop;
      total:=total+1;
    end loop;
  end loop;
  for finding in select value from jsonb_array_elements('[
    {"source":"SA04009NY","hash":"2c3ad86cdcb0cca39713943b475003e6c5c793bfa794ca22d92c38065cf1cc1f","alternative":"ST04009NY","kind":"identity_mismatch","summary":"FAA index SA04009NY delivers a PDF identifying ST04009NY. A separate current ST04009NY record with a complete reviewed certificate is available. The SA entry remains deferred; no identity merge or supersession is inferred."},
    {"source":"SA01635LA","hash":"3877ca36480b7d4b33b6d868f243e0c112dcb503f2298fc0a65714b2dd7a5a6c","alternative":"ST01635LA","kind":"incomplete_original","summary":"SA01635LA delivers only Page 1 of 2. A separate current ST01635LA record provides a complete three-page noise-reduction certificate with additional maintenance conditions. The missing SA page remains unresolved; the records are not treated as interchangeable."}
  ]'::jsonb) loop
    select v.id into original_version from public.document_versions v join public.documents d on d.id=v.document_id
      where d.authority='FAA' and d.document_type='STC' and d.document_number=finding->>'source' and v.content_sha256=finding->>'hash'
        and d.is_published and v.is_published and v.status='current'
        and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.source='FAA:STC:B737' and m.is_active)
      order by v.retrieved_at desc limit 1;
    select v.id into alternative_version from public.document_versions v join public.documents d on d.id=v.document_id
      where d.authority='FAA' and d.document_type='STC' and d.document_number=finding->>'alternative'
        and v.content_sha256=(select value->>'hash' from jsonb_array_elements($review$[
  {
    "number":"ST04009NY","source_url":"https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID198838941920250501135110.0001",
    "hash":"bb7d2494050a277dd6ca56ac9e07653384cc95231c44f55c6a2b050a2d9bdab1","models":["737-700","737-800"],"page":1,
    "excerpt":"ST04009NY, reissued January 8, 2025, lists A16WE and 737-300/-400/-500/-600/-700/-800 Series for an ADS-B Out installation. Only supported 737-700/-800 model scope is mapped.",
    "conditions":{"configuration":"Page 1 describes dual ACSS XS-950 transponders, dual CMA-3024 WAAS/GNSS receivers, specified antenna alternatives and failure annunciators. Individual installation is not verified.","existing_system":"The existing transponder system must comply with Mode S, Mode S ELS and Mode S EHS; its control panel must provide ATC/XPDR failure indication.","compatibility_permission":"Page 3 requires installer compatibility assessment and written holder permission for use by another person.","source_identity":"This is the separate FAA ST04009NY record. It is not a correction or automatic replacement of SA04009NY.","source_completeness":"All three certificate pages were obtained; supporting design, flight-manual and maintenance documents remain unobtained."},
    "references":[
      {"authority":"AERSALE","key":"MDL:B737-MDL-0019:A:2019-06-11","label":"AerSale B737-MDL-0019 Revision A","models":["737-700","737-800"],"page":1,"excerpt":"Installation is in accordance with Master Data List B737-MDL-0019 Revision A, June 11, 2019, or later FAA-approved revisions."},
      {"authority":"AERSALE","key":"AFMS:B737-AFM-0017:IR:2019-09-04","label":"AerSale B737-AFM-0017 Revision IR","models":["737-700","737-800"],"page":1,"excerpt":"B737-AFM-0017 Revision IR, September 4, 2019, or later FAA-approved revisions is a required part of this STC."},
      {"authority":"AERSALE","key":"ICA:B737-ICA-0019:B:2019-06-11","label":"AerSale B737-ICA-0019 Revision B","models":["737-700","737-800"],"page":1,"excerpt":"For maintenance and inspections, apply B737-ICA-0019 Revision B, June 11, 2019, or later FAA-accepted revisions."}
    ]
  },
  {
    "number":"ST01635LA","source_url":"https://drs.faa.gov/browse/excelExternalWindow/70809A3F184E1A538625802F00674984.0001",
    "hash":"60fdc54d5b816ea8d85d186cdef7b37702e6303cc3f771eeedf2c9963d92403c","models":["737-700","737-800"],"page":1,
    "excerpt":"ST01635LA, amended August 18, 2016, lists A16WE and 737-700/-700C/-800/-900 Series for a Cabin Interior Noise Reduction Kit. Only supported 737-700/-800 models are mapped.",
    "conditions":{"installation":"Installer compatibility assessment is required. Individual-aircraft installation and compliance are not established.","records_permission":"A copy of the STC must be included in permanent aircraft records. Written holder permission is required for another person to use the certificate.","maintenance_scope":"Page 1 assigns different maintenance supplements to 737-700/-700C and 737-800. Follow the model-specific path.","certification_basis":"Page 3 limits its stated Part 26 basis to index list AC25-BBJ-7370 Revision J, July 30, 2012, or later FAA-approved revisions; the revision condition is preserved.","source_identity":"This separate ST01635LA record does not establish a renumbering or supersession of SA01635LA.","source_completeness":"All three certificate pages were obtained. Referenced index and maintenance documents remain unobtained."},
    "references":[
      {"authority":"AEROCON","key":"MASTER-INDEX:AC25-BBJ-7370:NC:2006-08-22","label":"Aerocon Master Index AC25-BBJ-7370 Revision NC","models":["737-700","737-800"],"page":1,"excerpt":"The design change references Index List AC25-BBJ-7370 Revision NC, August 22, 2006, or later FAA-approved revision."},
      {"authority":"AEROCON","key":"MMS:AC25-1346:NC:2006-02-18","label":"Aerocon AC25-1346 Revision NC - 737-700","models":["737-700"],"page":1,"excerpt":"For 737-700 and -700C Series, maintenance supplement AC25-1346 Revision NC, February 18, 2006, or later FAA-approved revision must be available to the operator at installation."},
      {"authority":"AEROCON","key":"MMS:AC25-1340:NC:2006-05-10","label":"Aerocon AC25-1340 Revision NC - 737-800","models":["737-800"],"page":1,"excerpt":"For 737-800 Series, maintenance supplement AC25-1340 Revision NC, May 10, 2006, or later FAA-approved revision must be available to the operator at installation."}
    ]
  }
]$review$::jsonb) where value->>'number'=finding->>'alternative')
        and d.is_published and v.is_published and v.status='current'
      order by v.retrieved_at desc limit 1;
    if original_version is null or alternative_version is null then raise exception 'Verified quality finding sources missing'; end if;
    insert into public.source_quality_findings(version_id,kind,summary,reviewed_record_version_id)
      values(original_version,finding->>'kind',finding->>'summary',alternative_version)
      on conflict(version_id,kind) do update set summary=excluded.summary,reviewed_record_version_id=excluded.reviewed_record_version_id;
  end loop;
  return total;
end $$;
revoke all on function public.review_boeing_stc_resolution() from public,anon,authenticated;
grant execute on function public.review_boeing_stc_resolution() to service_role;

