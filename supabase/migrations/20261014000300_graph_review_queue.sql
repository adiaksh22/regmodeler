create table public.source_attachments (
  id uuid primary key default gen_random_uuid(),version_id uuid not null references public.document_versions(id),
  file_name text not null,content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),storage_path text not null,
  mime_type text not null check(mime_type in('application/pdf','text/plain')),source_url text not null,
  is_active boolean not null default true,retrieved_at timestamptz not null default now(),
  unique(version_id,file_name,content_sha256),unique(version_id,id)
);
alter table public.source_attachments enable row level security;
revoke all on public.source_attachments from anon,authenticated;
grant select on public.source_attachments to anon,authenticated;
grant all on public.source_attachments to service_role;
create policy attachment_public on public.source_attachments for select to anon,authenticated using (
  exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id where v.id=version_id and v.is_published and d.is_published)
);
alter table public.relationships add column evidence_attachment_id uuid;
alter table public.relationships add constraint relationship_attachment_source foreign key(evidence_version_id,evidence_attachment_id) references public.source_attachments(version_id,id);

create function public.attach_source_file(p_version uuid,p_name text,p_hash text,p_path text,p_mime text,p_url text) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result uuid;
begin
  if p_name is null or p_name !~ '^[A-Za-z0-9_. ()-]{1,160}$' or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or p_mime not in('application/pdf','text/plain') or
    p_path is distinct from ('FAA/ATTACHMENT/reviewed/'||p_hash||case p_mime when 'application/pdf' then '.pdf' else '.html' end) or
    p_url is null or p_url !~ '^https://drs[.]faa[.]gov/api/drs/data-pull/download/[a-fA-F0-9-]+$' or
    not exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id where v.id=p_version and d.authority='FAA' and d.document_type in('AD','STC')) then raise exception 'Invalid attachment'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_version::text||p_name,0));
  update public.source_attachments set is_active=false where version_id=p_version and file_name=p_name;
  insert into public.source_attachments(version_id,file_name,content_sha256,storage_path,mime_type,source_url)
    values(p_version,p_name,p_hash,p_path,p_mime,p_url) on conflict(version_id,file_name,content_sha256) do update set is_active=true returning id into result;
  return result;
end $$;
revoke all on function public.attach_source_file(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.attach_source_file(uuid,text,text,text,text,text) to service_role;

create function public.complete_attachment_check(p_version uuid,p_count integer) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if p_count<1 or p_count>100 or (select count(*) from public.source_attachments where version_id=p_version and is_active)<>p_count then raise exception 'Incomplete attachment inventory'; end if;
  update public.document_versions set metadata=metadata||jsonb_build_object('additional_attachments_pending',false,'attachments_checked_at',now()) where id=p_version;
end $$;
revoke all on function public.complete_attachment_check(uuid,integer) from public,anon,authenticated;
grant execute on function public.complete_attachment_check(uuid,integer) to service_role;

create or replace view public.model_graph with(security_invoker=true) as
select r.id,d.document_number as tcds_number,s.label as model,t.label as target,t.entity_type as target_type,
  r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label as evidence_revision,v.source_url,
  d.document_number as source_document_number,d.document_type as source_document_type,t.natural_key as basis_key,
  null::text as path_via,'outgoing'::text as direction,v.id as evidence_version_id,
  s.id as source_entity_id,t.id as target_entity_id,s.id as model_entity_id,null::uuid as via_entity_id,r.evidence_attachment_id,a.file_name as evidence_file_name
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and s.entity_type='aircraft_model' and d.authority='FAA' and d.document_type='TCDS' and v.id=d.current_version_id and (r.evidence_attachment_id is null or a.is_active)
union all
select r.id,'2A13',t.label,s.label,s.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,s.natural_key,null::text,'incoming'::text,v.id,s.id,t.id,t.id,null::uuid,r.evidence_attachment_id,a.file_name
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and t.entity_type='aircraft_model' and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current' and (r.evidence_attachment_id is null or a.is_active)
  and exists(select 1 from public.related_document_matches m where m.version_id=v.id and m.model=t.label and m.is_active)
union all
select r.id,'2A13',m.label,t.label,t.entity_type,r.relationship_type,r.evidence_page,r.evidence_excerpt,r.applicability_conditions,v.revision_label,v.source_url,
  d.document_number,d.document_type,t.natural_key,s.label,'outgoing'::text,v.id,s.id,t.id,m.id,s.id,r.evidence_attachment_id,a.file_name
from public.relationships r join public.catalog_entities s on s.id=r.source_entity_id join public.catalog_entities t on t.id=r.target_entity_id
join public.document_versions v on v.id=r.evidence_version_id join public.documents d on d.id=v.document_id left join public.source_attachments a on a.id=r.evidence_attachment_id
join public.relationships scope on scope.source_entity_id=s.id and scope.evidence_version_id=v.id and scope.relationship_type in('applies_to','approved_for')
join public.catalog_entities m on m.id=scope.target_entity_id and m.entity_type='aircraft_model'
where r.review_status='reviewed' and r.is_published and v.is_published and d.is_published and s.is_published and t.is_published and scope.review_status='reviewed' and scope.is_published and m.is_published and r.relationship_type='references' and d.authority='FAA' and d.document_type in('AD','STC') and v.status='current' and (r.evidence_attachment_id is null or a.is_active)
  and (scope.evidence_attachment_id is null or exists(select 1 from public.source_attachments sa where sa.id=scope.evidence_attachment_id and sa.is_active))
  and exists(select 1 from public.related_document_matches active where active.version_id=v.id and active.model=m.label and active.is_active);

create table public.source_review_decisions (
  version_id uuid not null references public.document_versions(id),model text not null check(model in('PA-28-140','PA-28-181')),
  decision text not null check(decision in('deferred','rejected')),private_note text not null default '',updated_at timestamptz not null default now(),primary key(version_id,model)
);
alter table public.source_review_decisions enable row level security;
revoke all on public.source_review_decisions from anon,authenticated;
grant select(version_id,model,decision,updated_at) on public.source_review_decisions to anon,authenticated;
grant all on public.source_review_decisions to service_role;
create policy decision_public_status on public.source_review_decisions for select to anon,authenticated using (
  exists(select 1 from public.document_versions v join public.documents d on d.id=v.document_id where v.id=version_id and v.is_published and d.is_published)
);

create view public.source_review_queue with(security_invoker=true) as
select v.id as version_id,m.model,d.document_type,d.document_number,coalesce(v.metadata->>'title',d.title) as title,v.source_url,v.retrieved_at,
  v.content_sha256 is not null as original_archived,coalesce((v.metadata->>'additional_attachments_pending')::boolean,false) as attachments_pending,
  case when g.id is not null then 'reviewed' else coalesce(q.decision,'pending') end as review_status,
  case when g.id is not null then 'Reviewed model connection' when history.reviewed then 'Changed source observation; previous relationships need renewed review' when v.content_sha256 is null then 'Primary original has not been archived' else 'Model and configuration evidence needs review' end as review_reason,
  case when g.id is not null then 3 when history.reviewed then 0 when v.content_sha256 is null then 1 else 2 end as priority
from public.related_document_matches m join public.document_versions v on v.id=m.version_id join public.documents d on d.id=v.document_id
left join lateral(select mg.id from public.model_graph mg where mg.evidence_version_id=v.id and mg.model=m.model and mg.path_via is null and mg.relationship_type in('applies_to','approved_for') limit 1) g on true
left join lateral(select exists(select 1 from public.relationships r join public.document_versions old on old.id=r.evidence_version_id join public.catalog_entities t on t.id=r.target_entity_id where old.document_id=d.id and old.id<>v.id and t.entity_type='aircraft_model' and t.label=m.model and r.review_status='reviewed') as reviewed) history on true
left join public.source_review_decisions q on q.version_id=v.id and q.model=m.model
where m.is_active and v.status='current' and d.document_type in('AD','STC');
grant select on public.source_review_queue to anon,authenticated,service_role;

create function public.set_source_review_decision(p_version uuid,p_model text,p_decision text,p_note text default '') returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if p_decision not in('pending','deferred','rejected') or p_note is null or length(p_note)>2000 or not exists(select 1 from public.source_review_queue where version_id=p_version and model=p_model and review_status<>'reviewed') then raise exception 'Review decision requires an unreviewed current source'; end if;
  if p_decision='pending' then delete from public.source_review_decisions where version_id=p_version and model=p_model;
  else insert into public.source_review_decisions(version_id,model,decision,private_note) values(p_version,p_model,p_decision,p_note) on conflict(version_id,model) do update set decision=excluded.decision,private_note=excluded.private_note,updated_at=now(); end if;
end $$;
revoke all on function public.set_source_review_decision(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.set_source_review_decision(uuid,text,text,text) to service_role;
