import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

// Real embedded PostgreSQL exercises the application schema without Docker.
// These stubs represent Supabase-owned infrastructure, not application tables.
const db = new PGlite();
const migrations = new URL('../supabase/migrations/', import.meta.url);
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant usage on schema public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  `);
  for (const name of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(name, migrations), 'utf8'));
  }
  const seed = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  await db.exec(seed);
  await db.exec(seed);
  assert.equal((await db.query('select count(*)::integer as n from public.documents')).rows[0].n, 3, 'Seed must be idempotent');
  const asRole = async (role, user, operation) => {
    await db.exec(`begin; set local role ${role};`);
    try {
      if (user) await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
      return await operation();
    } finally { await db.exec('rollback'); }
  };
  const query = (sql, params) => db.query(sql, params);
  await asRole('anon', null, async () => {
    const models = await query("select tcds_number from public.search_tcds('PA-28',20)");
    assert.deepEqual(models.rows.map(row => row.tcds_number), ['2A13']);
    assert.equal((await query("select * from public.search_tcds('%',20)")).rows.length, 0, 'Search treats wildcard input literally');
    assert.equal((await query("select * from public.search_tcds(repeat('a',201),20)")).rows.length, 0);
  });
  await db.query("update public.documents set is_published=false where document_number='E7CE'");
  await asRole('anon', null, async () => {
    assert.equal((await query('select * from public.tcds_catalog')).rows.length, 2, 'Invoker view must hide drafts');
  });
  await assert.rejects(asRole('anon', null, () => query("update public.documents set title='tampered'")), /permission denied/);
  await assert.rejects(asRole('anon', null, () => query('select * from public.ingestion_checkpoints')), /permission denied/);
  await assert.rejects(db.query("update public.documents set current_version_id='20000000-0000-4000-8000-000000000002' where document_number='2A13'"), /foreign key/);

  const userA = '30000000-0000-4000-8000-000000000001';
  const userB = '30000000-0000-4000-8000-000000000002';
  const entity = '40000000-0000-4000-8000-000000000001';
  await db.query('insert into auth.users(id) values($1),($2)', [userA,userB]);
  await db.query("insert into public.catalog_entities(id,authority,entity_type,natural_key,label,is_published) values($1,'FAA','aircraft_model','PA-28-140','PA-28-140',true)",[entity]);
  const certificate = '40000000-0000-4000-8000-000000000002';
  await db.query("insert into public.catalog_entities(id,authority,entity_type,natural_key,label,is_published) values($1,'FAA','certificate','2A13','2A13',true)",[certificate]);
  await db.query("insert into public.relationships(source_entity_id,target_entity_id,relationship_type,evidence_version_id,evidence_page,evidence_excerpt,is_published) values($1,$2,'covered_by','20000000-0000-4000-8000-000000000001',1,'Test evidence fixture',true)",[entity,certificate]);
  await asRole('anon',null,async () => assert.equal((await query('select * from public.relationships')).rows.length,0,'Unreviewed graph edges must be hidden'));
  await db.exec("update public.relationships set review_status='reviewed'");
  await asRole('anon',null,async () => assert.equal((await query('select * from public.relationships')).rows.length,1));
  await db.exec("update public.document_versions set is_published=false where id='20000000-0000-4000-8000-000000000001'");
  await asRole('anon',null,async () => assert.equal((await query('select * from public.relationships')).rows.length,0,'Unpublished evidence must hide graph edges'));
  await db.query('insert into public.watchlists(user_id,entity_id) values($1,$2)',[userA,entity]);
  await asRole('authenticated',userA,async () => assert.equal((await query('select * from public.watchlists')).rows.length,1));
  await asRole('authenticated',userB,async () => {
    assert.equal((await query('select * from public.watchlists')).rows.length,0);
    assert.equal((await query('delete from public.watchlists returning id')).rows.length,0);
  });
  await assert.rejects(asRole('authenticated',userB,() => query('insert into public.watchlists(user_id,entity_id) values($1,$2)',[userA,entity])), /row-level security/);
  assert.equal((await query("select public from storage.buckets where id='regulatory-sources'")).rows[0].public,false);
  const importRecord = {
    source_version_id:'DRSDOCID125895332520251113164724.0001',revision_label:'66',revision_date:'2025-10-10',status:'current',
    source_url:'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID125895332520251113164724.0001',
    retrieved_at:'2026-10-13T00:00:00Z',content_sha256:'a'.repeat(64),storage_path:`FAA/TCDS/2A13/${'a'.repeat(64)}.pdf`,
    metadata:{model:'PA-28-140',snapshot_sha256:'b'.repeat(64),source_modified_at:'2025-12-15T18:03:54.151Z'},
  };
  const startRun = async (id,started) => query("insert into public.ingestion_runs(id,source,status,started_at) values($1,'FAA:TCDSMODEL:2A13','running',$2)",[id,started]);
  const commit = (id,records) => query('select public.commit_pa28_tcds($1,$2::jsonb)',[id,JSON.stringify(records)]);
  const run1='50000000-0000-4000-8000-000000000001';
  const run2='50000000-0000-4000-8000-000000000002';
  const run3='50000000-0000-4000-8000-000000000003';
  await startRun(run1,'2026-10-13T00:00:00Z');
  await assert.rejects(asRole('anon',null,()=>commit(run1,[importRecord])),/permission denied/);
  await commit(run1,[importRecord]);
  assert.equal((await query("select content_sha256 from public.document_versions where id='20000000-0000-4000-8000-000000000001'")).rows[0].content_sha256,'a'.repeat(64),'Initial import enriches the seed without replacing evidence IDs');
  const versionCount = (await query('select count(*)::integer n from public.document_versions')).rows[0].n;
  await startRun(run2,'2026-10-13T01:00:00Z');
  await commit(run2,[importRecord]);
  assert.equal((await query('select count(*)::integer n from public.document_versions')).rows[0].n,versionCount,'Repeated imports do not duplicate snapshots');
  await startRun(run3,'2026-10-13T02:00:00Z');
  const corrected={...importRecord,content_sha256:'c'.repeat(64),storage_path:`FAA/TCDS/2A13/${'c'.repeat(64)}.pdf`,metadata:{...importRecord.metadata,snapshot_sha256:'d'.repeat(64)}};
  await assert.rejects(commit(run3,[corrected,{...importRecord,status:'invalid'}]),/check constraint/);
  assert.equal((await query('select count(*)::integer n from public.document_versions')).rows[0].n,versionCount,'Failed batch rolls back all snapshots');
  assert.equal((await query("select last_successful_run_id from public.ingestion_checkpoints where source='FAA:TCDSMODEL:2A13'")).rows[0].last_successful_run_id,run2,'Failed batch cannot advance checkpoint');
  await commit(run3,[corrected]);
  assert.equal((await query('select count(*)::integer n from public.document_versions')).rows[0].n,versionCount+1);
  assert.equal((await query("select content_sha256 from public.document_versions where id='20000000-0000-4000-8000-000000000001'")).rows[0].content_sha256,'a'.repeat(64),'A correction preserves previous original bytes');
  const stale='50000000-0000-4000-8000-000000000004';
  await startRun(stale,'2026-10-13T00:30:00Z');
  await assert.rejects(commit(stale,[importRecord]),/Stale import run/);
  console.log('Importer transaction checks passed: private RPC, stable evidence IDs, deduplication, correction history, rollback, checkpoint integrity, stale-run rejection.');
  console.log('Database checks passed: migrations, idempotent seed, search, publication/review RLS, importer isolation, current-version integrity, private watchlists, private source bucket.');
} finally { await db.close(); }
