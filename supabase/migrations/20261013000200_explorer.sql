create view public.tcds_versions with (security_invoker=true) as
select v.id,d.id as document_id,d.document_number as tcds_number,
  v.revision_label as revision,v.revision_date::text,v.status,v.source_url,v.retrieved_at,
  v.content_sha256,(v.id=d.current_version_id) as is_current
from public.documents d join public.document_versions v on v.document_id=d.id
where d.authority='FAA' and d.document_type='TCDS';
create view public.tcds_relationships with (security_invoker=true) as
select r.id,d.document_number as tcds_number,s.label as model,t.label as target,
  t.entity_type as target_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,
  r.applicability_conditions,v.revision_label as evidence_revision,v.source_url
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id
join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id
join public.documents d on d.id=v.document_id
where s.entity_type='aircraft_model' and d.authority='FAA' and d.document_type='TCDS'
  and v.id=d.current_version_id;
grant select on public.tcds_versions,public.tcds_relationships to anon,authenticated,service_role;

-- Expose only a successful catalog check timestamp, never internal errors/runs.
create function public.catalog_last_checked(p_number text) returns timestamptz
language sql stable security definer set search_path=pg_catalog,public as $$
  select r.completed_at from public.ingestion_checkpoints c
  join public.ingestion_runs r on r.id=c.last_successful_run_id
  where p_number='2A13' and c.source='FAA:TCDSMODEL:2A13' and r.status='succeeded'
    and exists(select 1 from public.documents d where d.authority='FAA' and d.document_type='TCDS'
      and d.document_number=p_number and d.is_published)
$$;
revoke all on function public.catalog_last_checked(text) from public;
grant execute on function public.catalog_last_checked(text) to anon,authenticated,service_role;

-- Curated subset checked against pages 1, 35 and 36 of the exact archived PDF.
-- Deliberately excludes optional equipment and serial-specific noise provisions.
create function public.review_pa28_basis() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  evidence uuid; certificate uuid; model_id uuid; target_id uuid;
  spec jsonb; section text; quote text; model_name text; page_number integer;
  amendment text; conditions jsonb; count_edges integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('review-pa28-basis',0));
  select v.id into evidence from public.documents d join public.document_versions v on v.id=d.current_version_id
  where d.authority='FAA' and d.document_type='TCDS' and d.document_number='2A13'
    and v.revision_label='66' and v.is_published and d.is_published
    and v.content_sha256='284334b7de705d5549fb9484e57a264b4266d02d8ccc67981e08d5295057c1b1';
  if evidence is null then raise exception 'Reviewed source PDF does not match current catalog'; end if;
  insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
  values('FAA','certificate','TCDS:2A13','Type certificate 2A13',true)
  on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into certificate;
  for spec in select value from jsonb_array_elements('[
    {"model":"PA-28-140","page":35,"car":"3-1, 3-2, 3-4","sections":["23.955","23.959","23.1327","23.1547"],
     "quote":"PA-28-140 and PA-28-151: CAR 3 effective May 15, 1956, including Amendments 3-1, 3-2, and 3-4; paragraphs 3.304 and 3.705 of Amendment 3-7 effective May 3, 1962; FAR 23.955 and 23.959 as amended by Amendment 23-7 effective September 14, 1969; and FAR 23.1327 and 23.1547 as amended by Amendment 23-20 effective September 1, 1977."},
    {"model":"PA-28-181","page":36,"car":"3-2, 3-4","sections":["23.207","23.221","23.955","23.959","23.1557(c)(1)","23.1327","23.1547"],
     "quote":"PA-28-181: CAR 3 effective May 15, 1956, including Amendments 3-2 and 3-4; paragraphs 3.304 and 3.705 of Amendment 3-7 effective May 3, 1962; FAR 23.207, 23.221, 23.955 and 23.959 as amended by Amendment 23-7 effective September 14, 1969; FAR 23.1557(c)(1) as amended by Amendment 23-18 effective May 2, 1977; and FAR 23.1327 and 23.1547 as amended by Amendment 23-20 effective September 1, 1977."}
  ]'::jsonb) loop
    model_name := spec->>'model';page_number:=(spec->>'page')::integer;quote:=spec->>'quote';
    insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
    values('FAA','aircraft_model',model_name,model_name,true)
    on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into model_id;
    insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,
      evidence_excerpt,review_status,is_published)
    select model_id,certificate,'covered_by',evidence,1,model_name||' is listed on the cover of TCDS 2A13, revision 66.','reviewed',true
    where not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=certificate and evidence_version_id=evidence);
    for section in select 'CAR3' union all select jsonb_array_elements_text(spec->'sections') loop
      amendment:=case when section='CAR3' then '1956-05-15'
        when section in('23.1327','23.1547') then '23-20'
        when section='23.1557(c)(1)' then '23-18' else '23-7' end;
      conditions:=case when section='CAR3' then jsonb_build_object('scope','Base CAR 3 with Amendments '||(spec->>'car')||'; paragraphs 3.304 and 3.705 at Amendment 3-7.','effective_date','1956-05-15')
        else jsonb_build_object('amendment',amendment,'effective_date',case amendment when '23-20' then '1977-09-01' when '23-18' then '1977-05-02' else '1969-09-14' end) end;
      insert into public.catalog_entities(authority,entity_type,natural_key,label,is_published)
      values('FAA','regulatory_provision',case when section='CAR3' then 'CAR3:1956-05-15' else 'FAR:'||section||':amendment:'||amendment end,
        case when section='CAR3' then 'CAR 3 · 1956 basis' else 'FAR '||section||' · Amendment '||amendment end,true)
      on conflict(authority,entity_type,natural_key) do update set is_published=true returning id into target_id;
      insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,
        evidence_excerpt,applicability_conditions,review_status,is_published)
      select model_id,target_id,'certified_against',evidence,page_number,quote,conditions,'reviewed',true
      where not exists(select 1 from public.relationships where source_entity_id=model_id and target_entity_id=target_id and evidence_version_id=evidence);
    end loop;
  end loop;
  select count(*) into count_edges from public.relationships where evidence_version_id=evidence and source_entity_id in
    (select id from public.catalog_entities where entity_type='aircraft_model' and natural_key in('PA-28-140','PA-28-181'));
  return count_edges;
end $$;
revoke all on function public.review_pa28_basis() from public,anon,authenticated;
grant execute on function public.review_pa28_basis() to service_role;
