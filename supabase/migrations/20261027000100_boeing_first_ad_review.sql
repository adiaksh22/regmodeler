-- Reviewed final-publication evidence for one explicitly bounded MAX AD.
alter table public.applicability_predicates drop constraint applicability_predicates_subject_kind_check;
alter table public.applicability_predicates add constraint applicability_predicates_subject_kind_check
  check(subject_kind in('aircraft_model','aircraft_serial','aircraft_line_number','original_certificate_date','installed_equipment','part_number','component_serial','software_version','stc','drawing_revision','engine_model','completed_action'));

create function public.review_boeing_ad_graph() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare evidence uuid; ad_entity uuid; model_entity uuid; component_entity uuid; relation uuid;
  rule_set uuid; rule_group uuid; model_name text; item jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-boeing-ad-2021-09-08',0));
  select v.id into evidence from public.document_versions v join public.documents d on d.id=v.document_id
    where d.authority='FAA' and d.document_type='AD' and d.document_number='2021-09-08'
      and v.is_published and d.is_published and v.status='current'
      and v.source_url='https://drs.faa.gov/browse/excelExternalWindow/41C8FF5365C3CA82862586C700472297.0001'
      and v.content_sha256='b6fbc4a4d33cadab1c2deb6836fc8b467ce4a2c120c68b33d93c874db25089dc'
      and v.metadata->>'original_source_url'='https://www.govinfo.gov/content/pkg/FR-2021-04-30/pdf/2021-09221.pdf'
      and v.metadata->>'original_source_kind'='final_federal_register'
      and v.metadata->>'original_publication_date'='2021-04-30'
      and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.source='FAA:ADFRAWD:B737' and m.is_active)
    order by v.retrieved_at desc limit 1;
  if evidence is null then raise exception 'Verified current Boeing original missing'; end if;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
    values('FAA','certificate','AD:2021-09-08','AD 2021-09-08',true)
    on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into ad_entity;
  foreach model_name in array array['737-8','737-9'] loop
    select m.model_entity_id into model_entity from public.related_scope_models m
      where m.source='FAA:ADFRAWD:B737' and m.model=model_name
        and exists(select 1 from public.related_document_matches active where active.version_id=evidence and active.source=m.source and active.model=model_name and active.is_active);
    if model_entity is null or not exists(select 1 from public.model_certificate_scope cs where cs.model_entity_id=model_entity and cs.tcds_number='A16WE') then raise exception 'Reviewed model or active index missing'; end if;
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_section,evidence_excerpt,applicability_conditions,review_status,is_published)
      select ad_entity,model_entity,'applies_to',evidence,3,'(c)',
        'Paragraph (c) covers Models 737-8 and 737-9, line numbers 7399 through 8082 inclusive, with an original airworthiness or original export certificate of airworthiness issued on or before April 9, 2021.',
        jsonb_build_object('line_number_scope','7399 through 8082 inclusive; a production line number is not the aircraft manufacturer serial number.',
          'certificate_scope','Original airworthiness certificate OR original export certificate of airworthiness issued on or before April 9, 2021.',
          'compliance','Paragraphs (f)-(i), prior work, approved methods and any AMOC must be reviewed from the full original. This tool does not record compliance.',
          'effective_date','2021-04-30'),'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=ad_entity and target_entity_id=model_entity and evidence_version_id=evidence and relationship_type='applies_to');
    select id into relation from public.relationships where source_entity_id=ad_entity and target_entity_id=model_entity and evidence_version_id=evidence and relationship_type='applies_to';
    insert into public.applicability_rule_sets(relationship_id,evidence_version_id,label,outcome,is_published)
      values(relation,evidence,'Model, production line and original certificate conditions','requires_review',true)
      on conflict(relationship_id) do update set label=excluded.label,is_published=true returning id into rule_set;
    delete from public.applicability_rule_groups where rule_set_id=rule_set;
    insert into public.applicability_rule_groups(rule_set_id,group_order,match_operator,label)
      values(rule_set,1,'all','Combined aircraft applicability') returning id into rule_group;
    insert into public.applicability_predicates(group_id,predicate_order,subject_kind,subject_key,comparison,expected,evidence_page,evidence_excerpt) values
      (rule_group,1,'aircraft_model','Aircraft model','equals',to_jsonb(model_name),3,'Paragraph (c): Model 737-8 and 737-9 airplanes.'),
      (rule_group,2,'aircraft_line_number','Production line number','inclusive_range','{"minimum":7399,"maximum":8082}',3,'Paragraph (c): line numbers 7399 through 8082 inclusive.'),
      (rule_group,3,'original_certificate_date','Original airworthiness OR original export certificate date','at_or_before','"2021-04-09"',3,'Paragraph (c): original airworthiness certificate or original export certificate of airworthiness issued on or before April 9, 2021.');
  end loop;
  for item in select value from jsonb_array_elements('[
    {"key":"BOEING:737MAX:P6-SPCU-SUPPORT","label":"737 MAX P6 panel / SPCU mounting tray","section":"(g)(1)","excerpt":"Paragraph (g)(1) names the P6 panel assembly, including the standby power control unit mounting tray, located behind the first officer."},
    {"key":"BOEING:737MAX:MAIN-INSTRUMENT-PANEL","label":"737 MAX main instrument panel assembly","section":"(g)(2)","excerpt":"Paragraph (g)(2) names the main instrument panel assembly located in front of and between the captain and first officer."}
  ]'::jsonb) loop
    insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
      values('BOEING','appliance_model',item->>'key',item->>'label',true)
      on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into component_entity;
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_section,evidence_excerpt,applicability_conditions,review_status,is_published)
      select ad_entity,component_entity,'affects_component',evidence,3,item->>'section',item->>'excerpt',
        jsonb_build_object('scope','Applies only in the combined aircraft scope in paragraph (c).','action','Electrical bonding modification as applicable, using an approved method; the full original controls.','configuration','Component identity identifies a named assembly, not a part-number or installation determination.'),'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=ad_entity and target_entity_id=component_entity and evidence_version_id=evidence and relationship_type='affects_component');
  end loop;
  return 4;
end $$;
revoke all on function public.review_boeing_ad_graph() from public,anon,authenticated;
grant execute on function public.review_boeing_ad_graph() to service_role;
