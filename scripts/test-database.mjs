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
  console.log('Database checks passed: migrations, idempotent seed, search, publication/review RLS, importer isolation, current-version integrity, private watchlists, private source bucket.');
} finally { await db.close(); }
