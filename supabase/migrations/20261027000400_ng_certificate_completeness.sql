-- FAA delivery contains page 1 only although its footer says Page 1 of 2.
-- Keep the observed model list/reference scoped to that page and expose the missing-page limit.
alter function public.review_boeing_ng_graph() rename to review_boeing_ng_graph_core;
revoke all on function public.review_boeing_ng_graph_core() from public,anon,authenticated,service_role;
create function public.review_boeing_ng_graph() returns integer
language plpgsql security definer set search_path=pg_catalog,public as $$
declare reviewed integer;
begin
  reviewed:=public.review_boeing_ng_graph_core();
  update public.relationships r set applicability_conditions=r.applicability_conditions||jsonb_build_object(
    'source_completeness','FAA primary PDF contains one scanned page labeled Page 1 of 2. The second page has not been obtained. Only the observed model list and reference are mapped; complete certificate terms are not established.'
  ) from public.document_versions v join public.documents d on d.id=v.document_id
  where r.evidence_version_id=v.id and d.authority='FAA' and d.document_type='STC' and d.document_number='SA01635LA'
    and v.content_sha256='3877ca36480b7d4b33b6d868f243e0c112dcb503f2298fc0a65714b2dd7a5a6c';
  return reviewed;
end $$;
revoke all on function public.review_boeing_ng_graph() from public,anon,authenticated;
grant execute on function public.review_boeing_ng_graph() to service_role;
