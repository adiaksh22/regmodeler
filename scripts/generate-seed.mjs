import { readFileSync, writeFileSync } from 'node:fs';
const samples = JSON.parse(readFileSync(new URL('../src/data/tcds-samples.json', import.meta.url), 'utf8'));
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = samples.map((sample, index) => {
  const documentId = `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  const versionId = `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  const [month, day, year] = sample.revision_date.split('/');
  const revisionDate = `${year}-${month}-${day}`;
  const metadata = JSON.stringify({ model: sample.model, holder: sample.holder, product_type: sample.product_type });
  return `insert into public.documents(id,authority,document_type,document_number,title,is_published)
values (${quote(documentId)},'FAA','TCDS',${quote(sample.tcds_number)},${quote('TCDS ' + sample.tcds_number)},true) on conflict do nothing;
insert into public.document_versions(id,document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
values (${quote(versionId)},${quote(documentId)},${quote(sample.url.split('/').at(-1))},${quote(sample.revision)},${quote(revisionDate)},${quote(sample.status)},${quote(sample.url)},${quote(sample.retrieved_at)},${quote(metadata)}::jsonb,true) on conflict do nothing;
update public.documents set current_version_id=${quote(versionId)} where id=${quote(documentId)};`;
});
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), '-- Verified feasibility snapshots only; this does not perform live FAA ingestion.\n' + statements.join('\n\n') + '\n');
console.log('Generated the three-snapshot local database seed.');
