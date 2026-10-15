alter function public.review_boeing_737_family() rename to review_boeing_737_family_core;
revoke all on function public.review_boeing_737_family_core() from public,anon,authenticated,service_role;

create function public.review_boeing_737_family() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare reviewed integer;
begin
  reviewed:=public.review_boeing_737_family_core();
  update public.aircraft_variant_facts f set evidence_page=23
  from public.aircraft_variant_profiles p join public.catalog_entities e on e.id=p.entity_id
  join public.document_versions v on v.id=p.evidence_version_id
  where f.variant_entity_id=p.entity_id and f.evidence_version_id=p.evidence_version_id
    and e.natural_key in('737-700 Series','737-800 Series') and f.fact_type in('vmo','mmo')
    and v.content_sha256='4a88ab57064783a155640b3eae4cbb812bb43596cce403f757c3d77be3f84e48';
  return reviewed;
end $$;
revoke all on function public.review_boeing_737_family() from public,anon,authenticated;
grant execute on function public.review_boeing_737_family() to service_role;
