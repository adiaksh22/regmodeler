create or replace function public.review_pa28_expanded_graph() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; v uuid; a uuid; source_id uuid; model_id uuid; ref_id uuid; model_name text; count_rows integer:=0;
begin
 perform pg_advisory_xact_lock(hashtextextended('review-pa28-expanded',0));
 for item in select value from jsonb_array_elements('[{"type":"AD","number":"2013-02-13","hash":"cf4164d57e891c90ce13436f92f2c84edaafd059b3c8670ea435f671cd9e32ba","models":["PA-28-140","PA-28-181"],"page":5,"excerpt":"Paragraph (c) includes PA-28-140 and PA-28-181, all serial numbers, certificated in any category.","conditions":{"aircraft_scope":"All serial numbers. Inspection requirements and compliance schedules must be evaluated from the full AD; compliance is not recorded."},"reference":{"key":"SB:1245A:2012-11-28","label":"Piper SB 1245A - November 28, 2012","page":6,"excerpt":"Paragraph (l)(2)(i): Piper Aircraft, Inc. Mandatory Service Bulletin No. 1245A, November 28, 2012."}},{"type":"AD","number":"2020-26-16","hash":"4c16d70b504baeac24c9219b3c1ddb2aa00eef7fe898be7c0c5622bb8dd18b79","models":["PA-28-181"],"page":13,"excerpt":"Table 1 lists PA-28-181, all serial numbers. Additional applicability criteria are stated in paragraph (c), page 12.","conditions":{"additional_criteria":"At least one of: 5,000 or more hours time-in-service; a wing spar replaced with a serviceable spar having more than zero hours; or missing/incomplete maintenance records. These conditions are not captured in the browser profile.","compliance":"Model scope alone does not determine individual applicability or compliance."},"reference":{"key":"SB:1345:2020-03-27","label":"Piper SB 1345 - March 27, 2020","page":17,"excerpt":"Paragraph (q)(2)(i): Piper Aircraft, Inc. Service Bulletin No. 1345, March 27, 2020."}},{"type":"STC","number":"SA01941LA","hash":"ce147af1b7402590a0839bfc0e7a106cb249d27b7db74a04a8a247d622ddf024","models":["PA-28-140"],"page":1,"attachment":"e9a81f4565fac8055352bfb9435e5747737484300144994a3bb0b204c9f2b60e","excerpt":"Approved Model List, reissued May 26, 2023, item 2 includes PA-28-140 under type certificate 2A13.","conditions":{"installation":"Installation is not confirmed. The primary certificate requires installer compatibility determination, written holder permission and retention of the certificate.","required_data":"Use the approved model list and applicable flight manual supplement, including approved revisions. PA-28-181 is not listed in this AML."},"reference":{"key":"AML:SA01941LA:2023-05-26","label":"SA01941LA approved model list - May 26, 2023","page":1,"excerpt":"The approved model list identifies the models and type certificates covered by SA01941LA."}},{"type":"STC","number":"SA4236WE","hash":"f2017cb743116b40f83d6e830bcda853c2aed5b92aef58fa844866ceccb85775","models":["PA-28-140","PA-28-181"],"page":1,"excerpt":"Original product type certificate 2A13; models include PA-28-140 and PA-28-181. Installation of inflatable door seal.","conditions":{"installation":"Not confirmed on an individual aircraft. The installer must determine compatibility with prior modifications; written holder permission is required.","required_data":"Aerocessories Drawing No. 3920, July 2, 1980, or later FAA-approved revision. Additional limitations appear on page 3."},"reference":{"key":"TCDS:2A13","label":"TCDS 2A13","kind":"certificate","authority":"FAA","page":3,"excerpt":"The certification basis for the airplane is complete in Type Certificate Data Sheet 2A13."}}]'::jsonb) loop
  select dv.id into v from public.document_versions dv join public.documents d on d.id=dv.document_id
   where d.authority='FAA' and d.document_type=item->>'type' and d.document_number=item->>'number' and dv.content_sha256=item->>'hash'
   and dv.status='current' and dv.is_published and d.is_published and exists(select 1 from public.related_document_matches match where match.version_id=dv.id and match.is_active) limit 1;
  if v is null then raise exception 'Verified current original missing'; end if;
  a:=null;
  if item ? 'attachment' then
   select id into a from public.source_attachments where version_id=v and content_sha256=item->>'attachment' and is_active and mime_type='application/pdf';
   if a is null then raise exception 'Verified model list missing'; end if;
  end if;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published) values('FAA','certificate',(item->>'type')||':'||(item->>'number'),(item->>'type')||' '||(item->>'number'),true)
    on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into source_id;
  for model_name in select jsonb_array_elements_text(item->'models') loop
   select id into model_id from public.catalog_entities where authority='FAA' and entity_type='aircraft_model' and natural_key=model_name;
   if model_id is null or not exists(select 1 from public.related_document_matches where version_id=v and model=model_name and is_active) then raise exception 'Current model index missing'; end if;
   insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_attachment_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
    select source_id,model_id,case item->>'type' when 'AD' then 'applies_to' else 'approved_for' end,v,a,(item->>'page')::integer,item->>'excerpt',item->'conditions','reviewed',true
    where not exists(select 1 from public.relationships where source_entity_id=source_id and target_entity_id=model_id and evidence_version_id=v and evidence_attachment_id is not distinct from a);
   count_rows:=count_rows+1;
  end loop;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
   values(coalesce(item->'reference'->>'authority','PIPER'),coalesce(item->'reference'->>'kind','service_document'),item->'reference'->>'key',item->'reference'->>'label',true)
   on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into ref_id;
  insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_attachment_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
   select source_id,ref_id,'references',v,a,(item->'reference'->>'page')::integer,item->'reference'->>'excerpt',jsonb_build_object('source_text',case when a is not null then 'The approved model list is archived with this certificate.' when item->>'type'='AD' then 'The reference is verified in the AD. The manufacturer bulletin text has not been retrieved.' else 'The type-certificate reference is verified on the STC continuation page.' end),'reviewed',true
   where not exists(select 1 from public.relationships where source_entity_id=source_id and target_entity_id=ref_id and evidence_version_id=v and relationship_type='references' and evidence_attachment_id is not distinct from a);
  count_rows:=count_rows+1;
 end loop;
 return count_rows;
end $$;
revoke all on function public.review_pa28_expanded_graph() from public,anon,authenticated;
grant execute on function public.review_pa28_expanded_graph() to service_role;
