-- Only exact, reviewed originals can publish the selected 737NG paths.
create function public.review_boeing_ng_graph() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare item jsonb; reference jsonb; evidence uuid; source_entity uuid; model_entity uuid; reference_entity uuid;
  model_name text; total integer:=0;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-boeing-ng-first-batch',0));
  for item in select value from jsonb_array_elements($review$[
  {
    "type":"AD","number":"2001-14-05","source_url":"https://drs.faa.gov/browse/excelExternalWindow/38671E9CB14B15CF86256A860053FF82.0001",
    "published_url":"https://www.govinfo.gov/content/pkg/FR-2001-07-11/pdf/01-17121.pdf","publication_date":"2001-07-11",
    "hash":"1318628c715aecbd0a11598d639a3435f74edda6bafe4ac918aab97e4ab2586a","models":["737-700","737-800"],"page":2,
    "excerpt":"Applicability covers all Model 737-600, -700, -700C and -800 series airplanes, certificated in any category. Only the two reviewed supported model identities are mapped here.",
    "conditions":{"scope":"The original includes 737-600 and 737-700C as well; this tool has not reviewed those models.","action":"Paragraph (a) prohibits installing elevator tab repairs not done in accordance with Boeing All Operator Message M-7200-01-00756 Revision 1, May 29, 2001. This is an installation restriction, not a claim that every aircraft needs a new repair.","effective_date":"2001-07-26","compliance":"Prior work, approved repair data and AMOCs remain subject to review; compliance is not recorded."},
    "references":[{"authority":"BOEING","key":"AOM:M-7200-01-00756:R1:2001-05-29","label":"Boeing AOM M-7200-01-00756 Revision 1","page":2,"section":"(a)","excerpt":"Paragraph (a) requires elevator tab repairs to be in accordance with Boeing All Operator Message M-7200-01-00756, Revision 1, dated May 29, 2001.","conditions":{"source_text":"The reference is verified in the AD; the message itself has not been obtained."}}]
  },
  {
    "type":"STC","number":"SA01635LA","source_url":"https://drs.faa.gov/browse/excelExternalWindow/B4937613F858F5748625721F0058F42D.0001",
    "hash":"3877ca36480b7d4b33b6d868f243e0c112dcb503f2298fc0a65714b2dd7a5a6c","models":["737-700","737-800"],"page":1,
    "excerpt":"Certificate SA01635LA explicitly lists A16WE, 737-700 Series and 737-800 Series for installation of a Cabin Interior Noise Reduction Kit.",
    "conditions":{"installation":"Individual-aircraft installation is not confirmed. Compatibility with previously approved configurations must be determined before incorporation.","permission":"Use by another person requires written permission from the certificate holder.","model_scope":"The certificate itself lists the two model series; no separate approved model list is needed to establish this reviewed model scope.","certification_basis":"The certificate states Part 25, with certification basis set forth in TCDS A16WE. No additional Part 25 text is imported by this review."},
    "references":[{"authority":"AEROCON","key":"MASTER-INDEX:AC25-BBJ-7370:NC:2006-08-22","label":"Aerocon Master Index AC25-BBJ-7370 Revision NC","page":1,"section":"Description of Type Design Change","excerpt":"Installation is in accordance with Aerocon Master Index List Report AC25-BBJ-7370 Revision NC, dated August 22, 2006, or later FAA-approved revision.","conditions":{"source_text":"Only the certificate reference is reviewed. The master index and design data have not been obtained."}}]
  }
]$review$::jsonb) loop
    select v.id into evidence from public.document_versions v join public.documents d on d.id=v.document_id
      where d.authority='FAA' and d.document_type=item->>'type' and d.document_number=item->>'number'
        and d.is_published and v.is_published and v.status='current'
        and v.content_sha256=item->>'hash' and v.source_url=item->>'source_url'
        and (not(item?'published_url') or (v.metadata->>'original_source_url'=item->>'published_url'
          and v.metadata->>'original_source_kind'='final_federal_register' and v.metadata->>'original_publication_date'=item->>'publication_date'))
        and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.is_active)
      order by v.retrieved_at desc limit 1;
    if evidence is null then raise exception 'Verified current NG original missing'; end if;
    insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
      values('FAA','certificate',(item->>'type')||':'||(item->>'number'),(item->>'type')||' '||(item->>'number'),true)
      on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into source_entity;
    for model_name in select jsonb_array_elements_text(item->'models') loop
      select scope.model_entity_id into model_entity from public.related_scope_models scope
        join public.related_source_scopes source on source.source=scope.source
        where source.scope_key='B737' and source.document_type=item->>'type' and scope.model=model_name
          and exists(select 1 from public.related_document_matches active where active.source=scope.source and active.version_id=evidence and active.model=model_name and active.is_active);
      if model_entity is null or not exists(select 1 from public.model_certificate_scope cs where cs.model_entity_id=model_entity and cs.tcds_number='A16WE') then raise exception 'Reviewed NG model or active match missing'; end if;
      insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
        select source_entity,model_entity,case item->>'type' when 'AD' then 'applies_to' else 'approved_for' end,evidence,(item->>'page')::integer,item->>'excerpt',item->'conditions','reviewed',true
        where not exists(select 1 from public.relationships r where r.source_entity_id=source_entity and r.target_entity_id=model_entity and r.evidence_version_id=evidence);
      total:=total+1;
    end loop;
    for reference in select value from jsonb_array_elements(item->'references') loop
      insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
        values(reference->>'authority','service_document',reference->>'key',reference->>'label',true)
        on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into reference_entity;
      insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_section,evidence_excerpt,applicability_conditions,review_status,is_published)
        select source_entity,reference_entity,'references',evidence,(reference->>'page')::integer,reference->>'section',reference->>'excerpt',reference->'conditions','reviewed',true
        where not exists(select 1 from public.relationships r where r.source_entity_id=source_entity and r.target_entity_id=reference_entity and r.evidence_version_id=evidence and r.relationship_type='references');
      total:=total+1;
    end loop;
  end loop;
  return total;
end $$;
revoke all on function public.review_boeing_ng_graph() from public,anon,authenticated;
grant execute on function public.review_boeing_ng_graph() to service_role;

-- Review decisions are model scoped; the guarded RPC already requires an active unreviewed source.
alter table public.source_review_decisions drop constraint source_review_decisions_model_check;
alter table public.source_review_decisions add constraint source_review_decisions_model_check check(length(btrim(model)) between 1 and 160);

