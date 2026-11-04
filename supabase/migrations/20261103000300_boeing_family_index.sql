-- Page 1 explicitly lists all 17 models under the pinned A16WE original.
-- This adds identity/certificate paths, not technical facts or AD/STC scope.
create function public.review_boeing_family_index() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare evidence uuid; family_id uuid; certificate_id uuid; model_id uuid; model_name text; target_id uuid; kind text;
begin
 perform pg_advisory_xact_lock(hashtextextended('review-boeing-737-family',0));
 select v.id into evidence from public.documents d join public.document_versions v on v.id=d.current_version_id
 where d.authority='FAA' and d.document_type='TCDS' and d.document_number='A16WE' and d.is_published and v.is_published
  and v.status='current' and v.revision_label='82' and v.revision_date='2026-10-20'
  and v.source_url='https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID161888576820261020201007.0001'
  and v.content_sha256='c61c215805c4210a6b6cd135099d41bb6dc244c72ee603de8bd512f75f964368'
  and jsonb_array_length(v.metadata->'model_list')=17
  and v.metadata->'model_list' @> '["737-10","737-100 Series","737-200 Series","737-200C Series","737-300 Series","737-400 Series","737-500 Series","737-600 Series","737-7","737-700 Series","737-700C Series","737-8","737-800 Series","737-8200","737-9","737-900 Series","737-900ER Series"]'::jsonb;
 if evidence is null then raise exception 'Reviewed A16WE family index original missing';end if;
 select id into family_id from public.catalog_entities where authority='BOEING' and entity_type='aircraft_family' and natural_key='BOEING:737' and is_published;
 select id into certificate_id from public.catalog_entities where authority='FAA' and entity_type='certificate' and natural_key='TCDS:A16WE' and is_published;
 if family_id is null or certificate_id is null then raise exception 'Reviewed family identities missing';end if;
 for model_name in select jsonb_array_elements_text(metadata->'model_list') from public.document_versions where id=evidence loop
  select id into model_id from public.catalog_entities where authority='FAA' and entity_type='aircraft_model' and natural_key=model_name and is_published;
  if model_id is null then raise exception 'Imported model identity missing';end if;
  foreach kind in array array['member_of','covered_by'] loop
   target_id:=case kind when 'member_of' then family_id else certificate_id end;
   -- Preserve model-section citations already reviewed in greater detail.
   if not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=target_id and relationship_type=kind and evidence_version_id=evidence) then
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,applicability_conditions,review_status,is_published)
    values(model_id,target_id,kind,evidence,1,
     'The model listing on physical PDF page 1 of A16WE Revision 82 includes '||model_name||' under Boeing Type Certificate A16WE.',
     '{"scope":"Reviewed model listing and type-certificate identity only. Technical specifications, individual-aircraft configuration and AD/STC applicability require separate review."}'::jsonb,'reviewed',true);
   end if;
  end loop;
 end loop;
 return (select count(*)::integer from public.relationships where evidence_version_id=evidence and relationship_type in('member_of','covered_by') and review_status='reviewed' and is_published and target_entity_id in(family_id,certificate_id));
end $$;
revoke all on function public.review_boeing_family_index() from public,anon,authenticated;
grant execute on function public.review_boeing_family_index() to service_role;
