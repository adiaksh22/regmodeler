-- Original source documents remain private; document viewers can receive scoped
-- downloads later. The importer uses a server secret, never a browser credential.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('regulatory-sources', 'regulatory-sources', false, 52428800,
  array['application/pdf','application/xml','text/xml','application/json','text/plain'])
on conflict (id) do nothing;
