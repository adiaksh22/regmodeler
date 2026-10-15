import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { relatedSnapshot } from '../apps/worker/src/related.mjs';

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
  await assert.rejects(query('select public.review_pa28_basis()'),/does not match/);
  await query("update public.document_versions set is_published=true,content_sha256='284334b7de705d5549fb9484e57a264b4266d02d8ccc67981e08d5295057c1b1' where id='20000000-0000-4000-8000-000000000001'");
  await query("update public.documents set current_version_id='20000000-0000-4000-8000-000000000001' where document_number='2A13'");
  await query('select public.review_pa28_basis()');
  const reviewedCount=(await query('select count(*)::integer n from public.relationships')).rows[0].n;
  await query('select public.review_pa28_basis()');
  assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,reviewedCount,'Reviewing evidence twice must not duplicate connections');
  await asRole('anon',null,async()=>{
    assert.equal((await query("select * from public.tcds_relationships where model='PA-28-181'")).rows.length,9);
    assert.equal((await query("select public.catalog_last_checked('2A13') as checked")).rows[0].checked!==null,true);
    assert.equal((await query("select public.catalog_last_checked('UNKNOWN') as checked")).rows[0].checked,null);
  });
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_basis()')),/permission denied/);
  await query('update public.documents set current_version_id=$1 where document_number=\'2A13\'',[ (await query("select id from public.document_versions where content_sha256=$1",['c'.repeat(64)])).rows[0].id ]);
  assert.equal((await query('select * from public.tcds_relationships')).rows.length,0,'Relationships must not silently carry over to an unreviewed new revision');
  console.log('Explorer checks passed: published history, model-specific citations, reviewed-source hash guard, repeat review, public freshness, private review, and new-revision coverage boundary.');
  const relatedRun='60000000-0000-4000-8000-000000000001';
  const sourceRecord={'drs:documentNumber':'SA_TEST','drs:title':'Test approval','drs:status':'Current','drs:stcTCNumbersMakeModel':['2A13 -- Piper -- PA-28-181'],documentGuid:'RELATEDTEST',documentURL:'https://drs.faa.gov/browse/excelExternalWindow/RELATEDTEST.0001',docLastModifiedDate:'2025-12-01T00:00:00Z'};
  const relatedRow=relatedSnapshot('STC',sourceRecord,'2026-10-13T00:00:00Z').row;
  const relatedStart=id=>query("insert into public.ingestion_runs(id,source,status) values($1,'FAA:STC:PA28','running')",[id]);
  const relatedCommit=(id,rows)=>query("select public.commit_pa28_related($1,'STC',$2::jsonb)",[id,JSON.stringify(rows)]);
  await relatedStart(relatedRun);await relatedCommit(relatedRun,[relatedRow]);
  assert.equal((await query("select * from public.source_change_events where source='FAA:STC:PA28'")).rows.length,0,'First scoped observation is a baseline, not a new regulation');
  await asRole('anon',null,async()=>{
    const found=(await query("select * from public.related_documents where model='PA-28-181' and is_active and status='current'")).rows;
    assert.equal(found.length,1);assert.equal(found[0].original_archived,false);assert.match(found[0].candidate_reason,/not verified/);
  });
  await assert.rejects(asRole('anon',null,()=>relatedCommit(relatedRun,[relatedRow])),/permission denied/);
  const second='60000000-0000-4000-8000-000000000002';await relatedStart(second);
  const correctedRelated=relatedSnapshot('STC',{...sourceRecord,'drs:title':'Corrected approval'},'2026-10-13T01:00:00Z').row;
  await relatedCommit(second,[correctedRelated]);
  const firstChange=(await query("select * from public.source_change_events where source='FAA:STC:PA28'")).rows;
  assert.equal(firstChange.length,1);assert.equal(firstChange[0].kind,'changed');assert.deepEqual(firstChange[0].changed_fields,['metadata']);
  assert.notEqual(firstChange[0].old_version_id,firstChange[0].new_version_id);
  assert.equal((await query('select * from public.related_documents where is_active')).rows.length,1);
  assert.equal((await query('select * from public.related_documents where not is_active')).rows.length,1,'Prior registry observations remain available');
  const third='60000000-0000-4000-8000-000000000003';await relatedStart(third);await relatedCommit(third,[correctedRelated]);
  assert.equal((await query("select * from public.source_change_events where source='FAA:STC:PA28'")).rows.length,1,'Repeated unchanged import adds no events');
  assert.equal((await query('select * from public.related_documents')).rows.length,2,'Repeat discovery does not duplicate metadata');
  const badRun='60000000-0000-4000-8000-000000000004';await relatedStart(badRun);
  await assert.rejects(relatedCommit(badRun,[{...correctedRelated,models:['UNKNOWN']}]),/check constraint/);
  assert.equal((await query("select * from public.source_change_events where source='FAA:STC:PA28'")).rows.length,1,'Failed import cannot create an event');
  assert.equal((await query('select * from public.related_documents where is_active')).rows.length,1,'A failed batch cannot deactivate the previous index');
  assert.equal((await query("select last_successful_run_id from public.ingestion_checkpoints where source='FAA:STC:PA28'")).rows[0].last_successful_run_id,third);
  const reference={section:'23.955',title:'Fuel flow.',body_text:'Reference fixture.',source_kind:'later_reference',edition_date:'2016-01-01',basis_key:'FAR:23.955:amendment:23-7',source_url:'https://www.govinfo.gov/content/pkg/CFR-2016-title14-vol1/xml/CFR-2016-title14-vol1-part23.xml',content_sha256:'e'.repeat(64),storage_path:'US/CFR/2016/fixture.xml',retrieved_at:'2026-10-13T00:00:00Z'};
  await query('select public.commit_reference_texts($1::jsonb)',[JSON.stringify([reference])]);
  await assert.rejects(query('select public.commit_reference_texts($1::jsonb)',[JSON.stringify([{...reference,source_kind:'exact_historical'}])]),/Invalid reference source/);
  await asRole('anon',null,async()=>assert.equal((await query('select source_kind from public.regulation_sources')).rows[0].source_kind,'later_reference'));
  const reviewRecords=[
    ['STC','SA2230CE','REVIEWSTC','42968de3068a3da4cf72896c64d1ae06db594feb7889855d4c43d9fe71371463'],
    ['AD','2020-24-05','REVIEWAD','56bcc802e7a5a992be7a62c9fa84c9c31cf6cbeccbf0ef93584a73ab9c64652d'],
  ];
  const reviewIds=[];
  for(const [type,number,guid,hash] of reviewRecords){
    const record={...sourceRecord,'drs:documentNumber':number,documentGuid:guid,documentURL:`https://drs.faa.gov/browse/excelExternalWindow/${guid}.0001`,'drs:stcTCNumbersMakeModel':['2A13 -- Piper -- PA-28-140','2A13 -- Piper -- PA-28-181'],'drs:adfrawdModel':['PA-28-140']};
    const row=relatedSnapshot(type,record,'2026-10-13T02:00:00Z').row;
    const run=(await query('insert into public.ingestion_runs(source,status) values($1,\'running\') returning id',[`FAA:${type==='AD'?'ADFRAWD':type}:PA28`])).rows[0].id;
    await query('select public.commit_pa28_related($1,$2,$3::jsonb)',[run,type,JSON.stringify([row])]);
    const version=(await query('select id from public.document_versions where source_version_id=$1',[row.source_version_id])).rows[0].id;reviewIds.push(version);
    await assert.rejects(asRole('anon',null,()=>query('select public.attach_source_original($1,$2,$3,$4::jsonb)',[version,hash,`FAA/${type}/reviewed/${hash}.pdf`,'{}'])),/permission denied/);
    await query('select public.attach_source_original($1,$2,$3,$4::jsonb)',[version,hash,`FAA/${type}/reviewed/${hash}.pdf`,'{}']);
    await assert.rejects(query('select public.attach_source_original($1,$2,$3,$4::jsonb)',[version,'f'.repeat(64),`FAA/${type}/reviewed/${'f'.repeat(64)}.pdf`,'{}']),/immutable/i);
  }
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_related_graph()')),/permission denied/);
  assert.equal((await query('select public.review_pa28_related_graph() as n')).rows[0].n,4);
  const connectionCount=(await query('select count(*)::integer n from public.relationships')).rows[0].n;
  await query('select public.review_pa28_related_graph()');
  assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,connectionCount);
  const publicGraph=()=>asRole('anon',null,()=>query("select * from public.model_graph where source_document_type in('AD','STC')"));
  assert.equal((await publicGraph()).rows.length,4);
  assert.equal((await publicGraph()).rows.filter(r=>r.path_via).length,1);
  await query('update public.document_versions set is_published=false where id=$1',[reviewIds[1]]);
  assert.equal((await publicGraph()).rows.length,2,'Unpublished AD evidence hides both its model edge and service-bulletin path');
  await query('update public.document_versions set is_published=true where id=$1',[reviewIds[1]]);
  await query('update public.related_document_matches set is_active=false where version_id=$1',[reviewIds[1]]);
  assert.equal((await publicGraph()).rows.length,2,'A changed discovery observation cannot retain a current reviewed path without renewed review');
  const events=(await asRole('anon',null,()=>query('select * from public.source_change_feed'))).rows;
  assert.ok(events.some(e=>e.kind==='missing_from_index'),'Missing observations are distinguished from regulatory withdrawal');
  const changed=events.find(e=>e.kind==='changed'&&e.document_number==='SA_TEST');assert.ok(changed);
  await query('update public.document_versions set is_published=false where id=$1',[changed.old_version_id]);
  assert.equal((await asRole('anon',null,()=>query('select * from public.source_change_feed where id=$1',[changed.id]))).rows.length,0,'Unpublished previous evidence hides the event');
  await assert.rejects(asRole('anon',null,()=>query('select * from public.source_observations')),/permission denied/);
  await assert.rejects(asRole('service_role',null,()=>query('select public.commit_pa28_related_core($1,$2,$3::jsonb)',[third,'STC','[]'])),/permission denied/);
  const returning=relatedSnapshot('STC',{...sourceRecord,'drs:title':'Corrected approval','drs:status':'Historical'},'2026-10-14T00:00:00Z').row;
  const returnRun=(await query("insert into public.ingestion_runs(source,status) values('FAA:STC:PA28','running') returning id")).rows[0].id;
  await relatedCommit(returnRun,[returning]);
  const returned=(await query("select * from public.source_change_events where run_id=$1 and kind='returned_to_index'",[returnRun])).rows[0];
  assert.ok(returned);assert.equal(returned.old_source_status,'current');assert.equal(returned.new_source_status,'historical');
  const countBeforeRepeat=(await query('select count(*)::integer n from public.source_change_events')).rows[0].n;
  const repeatRun=(await query("insert into public.ingestion_runs(source,status) values('FAA:STC:PA28','running') returning id")).rows[0].id;
  await relatedCommit(repeatRun,[returning]);assert.equal((await query('select count(*)::integer n from public.source_change_events')).rows[0].n,countBeforeRepeat);
  const expanded=JSON.parse(readFileSync(new URL('../apps/worker/src/expanded-review.json',import.meta.url)));
  await assert.rejects(query('select public.review_pa28_expanded_graph()'),/original missing/);
  const expandedIds=[];
  for(const entry of expanded){
    const document=(await query("insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA',$1,$2,$2,true) returning id",[entry.type,entry.number])).rows[0].id;
    const version=(await query("insert into public.document_versions(document_id,source_version_id,revision_label,status,source_url,retrieved_at,content_sha256,storage_path,is_published) values($1,$2,'reviewed','current','https://drs.faa.gov',now(),$3,$4,true) returning id",[document,entry.number,entry.hash,'FAA/'+entry.type+'/reviewed/'+entry.hash+'.pdf'])).rows[0].id;
    expandedIds.push(version);
    for(const model of entry.models)await query("insert into public.related_document_matches(source,version_id,model) values('test-expanded',$1,$2)",[version,model]);
    if(entry.attachment){
      await query("select public.attach_source_file($1,'AML.pdf',$2,$3,'application/pdf','https://drs.faa.gov/api/drs/data-pull/download/abcd-1234')",[version,entry.attachment,'FAA/ATTACHMENT/reviewed/'+entry.attachment+'.pdf']);
      await query('select public.complete_attachment_check($1,1)',[version]);
    }
  }
  await query("select public.set_source_review_decision($1,'PA-28-140','deferred','PRIVATE NOTE')",[expandedIds[0]]);
  await asRole('anon',null,async()=>{
    assert.equal((await query("select review_status from public.source_review_queue where version_id=$1 and model='PA-28-140'",[expandedIds[0]])).rows[0].review_status,'deferred');
    await assert.rejects(query('select private_note from public.source_review_decisions'),/permission denied/);
  });
  await assert.rejects(asRole('anon',null,()=>query("select public.set_source_review_decision($1,'PA-28-140','pending','')",[expandedIds[0]])),/permission denied/);
  assert.equal((await query('select public.review_pa28_expanded_graph() as n')).rows[0].n,10);
  const expandedCount=(await query('select count(*)::integer n from public.relationships')).rows[0].n;
  await query('select public.review_pa28_expanded_graph()');assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,expandedCount);
  const expandedRows=(await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[expandedIds]))).rows;
  assert.equal(expandedRows.length,12);assert.ok(expandedRows.every(r=>r.source_entity_id&&r.target_entity_id&&r.model_entity_id));
  const aml=expandedRows.find(r=>r.source_document_number==='SA01941LA');assert.ok(aml.evidence_attachment_id);assert.equal(aml.model,'PA-28-140');
  await assert.rejects(query('update public.relationships set evidence_attachment_id=$1 where evidence_version_id=$2',[aml.evidence_attachment_id,expandedIds[0]]),/foreign key/);
  await query('update public.source_attachments set is_active=false where id=$1',[aml.evidence_attachment_id]);
  assert.equal((await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=$1',[expandedIds[2]]))).rows.length,0,'Changed AML hides both approval and reference until renewed review');
  assert.equal((await asRole('anon',null,()=>query('select review_status from public.source_review_queue where version_id=$1',[expandedIds[2]]))).rows[0].review_status,'pending');
  await assert.rejects(query('select public.complete_attachment_check($1,1)',[expandedIds[2]]),/Incomplete/);
  await assert.rejects(query('select public.complete_attachment_check($1,null)',[expandedIds[2]]),/Incomplete/);
  console.log('Expanded graph checks passed: exact-source guards, shared identities, repeat review, parent-bound attachments, changed AML and private operator decisions.');

  const batch2=JSON.parse(readFileSync(new URL('../apps/worker/src/review-batch2.json',import.meta.url)));const batchIds=[];
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_batch2_graph()')),/permission denied/);
  await assert.rejects(query('select public.review_pa28_batch2_graph()'),/provenance missing/);
  for(const entry of batch2){
   const document=(await query("insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA',$1,$2,$2,true) returning id",[entry.type,entry.number])).rows[0].id;
   const version=(await query("insert into public.document_versions(document_id,source_version_id,revision_label,status,source_url,retrieved_at,content_sha256,storage_path,is_published) values($1,$2,'reviewed','current','https://drs.faa.gov',now(),$3,$4,true) returning id",[document,entry.number,entry.hash,'FAA/'+entry.type+'/reviewed/'+entry.hash+'.pdf'])).rows[0].id;batchIds.push(version);
   for(const model of entry.models)await query("insert into public.related_document_matches(source,version_id,model) values('test-batch2',$1,$2)",[version,model]);
  }
  await assert.rejects(query('select public.review_pa28_batch2_graph()'),/provenance missing/);
  await query('select public.attach_source_original($1,$2,$3,$4::jsonb)',[batchIds[0],batch2[0].hash,'FAA/AD/reviewed/'+batch2[0].hash+'.pdf',JSON.stringify({original_source_url:batch2[0].published_url,original_source_kind:'final_federal_register'})]);
  await assert.rejects(query('select public.review_pa28_batch2_graph()'),/series membership missing/);
  assert.equal((await query('select count(*)::integer n from public.relationships where evidence_version_id=any($1::uuid[])',[batchIds])).rows[0].n,0,'A missing series anchor rolls back the whole review batch');
  await query("update public.documents set current_version_id='20000000-0000-4000-8000-000000000001' where document_number='2A13'");
  assert.equal((await query('select public.review_pa28_batch2_graph() as n')).rows[0].n,14);
  const batchGraph=()=>asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[batchIds]));
  const batchRows=(await batchGraph()).rows;assert.equal(batchRows.length,16);
  assert.equal(batchRows.filter(r=>r.source_document_number==='SA09252AC-D').every(r=>r.model==='PA-28-181'),true);
  assert.equal(batchRows.filter(r=>r.source_document_number==='SA09257AC-D').every(r=>r.model==='PA-28-140'),true);
  assert.ok(batchRows.find(r=>r.model==='PA-28-181'&&r.basis_key==='AFMS:891444:1997-06-30'));
  assert.ok(batchRows.find(r=>r.model==='PA-28-140'&&r.basis_key==='AFMS:891454:1997-07-11'));
  assert.equal(batchRows.some(r=>/SA2969SW|SA2143WE/.test(r.target)),false,'Other variants do not create installed-STC dependencies for supported models');
  assert.ok(batchRows.filter(r=>r.source_document_number==='2024-10-04').every(r=>r.original_source_url===batch2[0].published_url));
  const n=(await query('select count(*)::integer n from public.relationships')).rows[0].n;await query('select public.review_pa28_batch2_graph()');assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,n);
  await query('update public.related_document_matches set is_active=false where version_id=$1',[batchIds[0]]);assert.equal((await batchGraph()).rows.length,14,'An inactive AD observation hides both scope and service-bulletin reference');
  console.log('Batch 2 checks passed: publication provenance, atomic review, series membership, model-specific supplements, repeat review and inactive-source boundaries.');


  const batch3=JSON.parse(readFileSync(new URL('../apps/worker/src/review-batch3.json',import.meta.url)));const fuelIds=[];
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_batch3_graph()')),/permission denied/);
  await assert.rejects(query('select public.review_pa28_batch3_graph()'),/original missing/);
  for(const entry of batch3){
   const document=(await query("insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA',$1,$2,$2,true) returning id",[entry.type,entry.number])).rows[0].id;
   const version=(await query("insert into public.document_versions(document_id,source_version_id,revision_label,status,source_url,retrieved_at,content_sha256,storage_path,is_published) values($1,$2,'reviewed','current','https://drs.faa.gov',now(),$3,$4,true) returning id",[document,entry.number,entry.hash,'FAA/'+entry.type+'/reviewed/'+entry.hash+'.pdf'])).rows[0].id;fuelIds.push(version);
   for(const model of entry.models)await query("insert into public.related_document_matches(source,version_id,model) values('test-batch3',$1,$2)",[version,model]);
  }
  assert.equal((await query('select public.review_pa28_batch3_graph() as n')).rows[0].n,19);
  const fuelGraph=()=>asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[fuelIds]));
  const fuelRows=(await fuelGraph()).rows;assert.equal(fuelRows.length,24);assert.equal(fuelRows.filter(r=>!r.path_via).length,6);
  assert.equal(fuelRows.filter(r=>r.relationship_type==='supersedes').length,2,'A reviewed supersession is scoped to both supported models');
  const serialEdges=fuelRows.filter(r=>r.source_document_number==='2018-07-03'&&!r.path_via);assert.ok(serialEdges.find(r=>r.model==='PA-28-140').applicability_conditions.serial_ranges.includes('28-20001'));
  assert.ok(serialEdges.find(r=>r.model==='PA-28-181').applicability_conditions.serial_ranges.includes('2843879'));
  assert.equal(fuelRows.filter(r=>r.source_document_number==='2005-19-20').every(r=>r.model==='PA-28-181'),true);
  const conversion=fuelRows.find(r=>r.source_document_number==='SA2660CE'&&!r.path_via);const conditional=fuelRows.find(r=>r.source_document_number==='2005-19-20'&&r.basis_key==='STC:SA2660CE');
  assert.equal(conditional.target_entity_id,conversion.source_entity_id,'AD and STC paths share the same canonical certificate node');
  assert.equal(fuelRows.filter(r=>r.basis_key==='STC:SE2563CE'||r.basis_key==='STC:SE2587CE').length,2);assert.ok(conversion.applicability_conditions.engine_condition.includes(' OR '));
  assert.equal(fuelRows.filter(r=>r.applicability_conditions.publisher_url).length,4,'Two dated publisher references are exposed in each model scope');
  const countFuel=(await query('select count(*)::integer n from public.relationships')).rows[0].n;await query('select public.review_pa28_batch3_graph()');assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,countFuel);
  await query('update public.related_document_matches set is_active=false where version_id=$1',[fuelIds[0]]);assert.equal((await fuelGraph()).rows.length,16,'Changed source observations hide supersession and all reference paths until renewed review');
  console.log('Fuel/airframe checks passed: serial-specific evidence, shared AD/STC identities, alternative engine approvals, dated publisher links and supersession boundaries.');

  const batch4=JSON.parse(readFileSync(new URL('../apps/worker/src/review-batch4.json',import.meta.url)));const componentIds=[];
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_batch4_graph()')),/permission denied/);
  await assert.rejects(query('select public.review_pa28_batch4_graph()'),/original or publication provenance missing/);
  await query('update public.related_document_matches set is_active=true where version_id=$1',[batchIds[0]]);
  const priorIds=(await query('select id from public.relationships where evidence_version_id=$1 order by id',[batchIds[0]])).rows;
  for(const entry of batch4.filter(e=>!e.published_url)){
   const document=(await query("insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA',$1,$2,$2,true) returning id",[entry.type,entry.number])).rows[0].id;
   const version=(await query("insert into public.document_versions(document_id,source_version_id,revision_label,status,source_url,retrieved_at,content_sha256,storage_path,is_published) values($1,$2,'reviewed','current','https://drs.faa.gov',now(),$3,$4,true) returning id",[document,entry.number,entry.hash,'FAA/'+entry.type+'/reviewed/'+entry.hash+'.pdf'])).rows[0].id;componentIds.push(version);
   for(const model of entry.models)await query("insert into public.related_document_matches(source,version_id,model) values('test-batch4',$1,$2)",[version,model]);
  }
  await query("update public.document_versions set metadata=metadata-'original_source_kind' where id=$1",[batchIds[0]]);
  await assert.rejects(query('select public.review_pa28_batch4_graph()'),/provenance missing/);
  assert.equal((await query('select count(*)::integer n from public.relationships where evidence_version_id=any($1::uuid[])',[componentIds])).rows[0].n,0,'Missing publication provenance rolls back the whole batch');
  await query('update public.document_versions set metadata=metadata||$2::jsonb where id=$1',[batchIds[0],JSON.stringify({original_source_kind:'final_federal_register'})]);
  assert.equal((await query('select public.review_pa28_batch4_graph() as n')).rows[0].n,13);
  assert.deepEqual((await query('select id from public.relationships where evidence_version_id=$1 order by id',[batchIds[0]])).rows,priorIds,'Publisher enrichment preserves existing evidence edge identities');
  const componentRows=(await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[componentIds]))).rows;
  for(const entry of batch4){
   const reviewedRows=(await query('select * from public.model_graph where source_document_number=$1',[entry.number])).rows;
   for(const row of reviewedRows.filter(r=>!r.path_via)){assert.equal(row.evidence_excerpt,entry.excerpt);assert.deepEqual(row.applicability_conditions,entry.conditions);}
   for(const reference of entry.references){const row=reviewedRows.find(r=>r.path_via&&r.basis_key===reference.key);assert.ok(row);assert.equal(row.evidence_excerpt,reference.excerpt);assert.deepEqual(row.applicability_conditions,reference.conditions);}
  }
  assert.equal(componentRows.length,13);assert.equal(componentRows.filter(r=>!r.path_via).length,4);
  assert.equal(componentRows.filter(r=>r.relationship_type==='supersedes').length,3);
  assert.ok(componentRows.filter(r=>r.source_document_number==='2017-14-04'&&!r.path_via).every(r=>!r.applicability_conditions.serial_ranges));
  const rib=componentRows.find(r=>r.source_document_number==='2016-07-21'&&!r.path_via);assert.equal(rib.model,'PA-28-181');assert.ok(rib.applicability_conditions.groups.includes('2843776-2843778'));
  const wheel=componentRows.find(r=>r.source_document_number==='2004-14-12'&&!r.path_via);assert.ok(wheel.applicability_conditions.groups.includes('Part II'));assert.ok(wheel.applicability_conditions.publication.includes('correction'));
  const enriched=(await query('select * from public.model_graph where evidence_version_id=$1',[batchIds[0]])).rows;assert.equal(enriched.length,2);assert.ok(!enriched.find(r=>!r.path_via).applicability_conditions.serial_ranges);
  assert.equal(enriched.find(r=>r.path_via).applicability_conditions.publisher_catalog_date,'2024-04-18');
  const countComponent=(await query('select count(*)::integer n from public.relationships')).rows[0].n;await query('select public.review_pa28_batch4_graph()');assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,countComponent);
  await query('update public.related_document_matches set is_active=false where version_id=$1',[componentIds[0]]);assert.equal((await query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[componentIds])).rows.length,7);
  console.log('Component checks passed: atomic provenance, stable enrichment IDs, equipment unknowns, action groups, publisher dates, supersession, repeat review and inactive-source boundaries.');

  const batch5=JSON.parse(readFileSync(new URL('../apps/worker/src/review-batch5.json',import.meta.url)));const equipmentIds=[];
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_batch5_graph()')),/permission denied/);
  await assert.rejects(query('select public.review_pa28_batch5_graph()'),/original missing/);
  for(const entry of batch5){
   const document=(await query("insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA','AD',$1,$1,true) returning id",[entry.number])).rows[0].id;
   const version=(await query("insert into public.document_versions(document_id,source_version_id,revision_label,status,source_url,retrieved_at,content_sha256,storage_path,is_published) values($1,$2,'reviewed','current','https://drs.faa.gov',now(),$3,$4,true) returning id",[document,entry.number,entry.hash,'FAA/AD/reviewed/'+entry.hash+'.pdf'])).rows[0].id;equipmentIds.push(version);
   for(const model of entry.models)await query("insert into public.related_document_matches(source,version_id,model) values('test-batch5',$1,$2)",[version,model]);
  }
  assert.equal((await query('select public.review_pa28_batch5_graph() as n')).rows[0].n,19);
  const equipmentRows=(await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[equipmentIds]))).rows;
  assert.equal(equipmentRows.length,26);assert.equal(equipmentRows.filter(r=>!r.path_via).length,6);
  assert.equal(equipmentRows.filter(r=>r.relationship_type==='affects_component').length,7);
  assert.equal(equipmentRows.filter(r=>r.relationship_type==='supersedes').length,3);
  assert.deepEqual([...new Set(equipmentRows.filter(r=>r.relationship_type==='affects_component').map(r=>r.target_type))].sort(),['appliance_model','engine_model']);
  for(const entry of batch5){
   const reviewedRows=equipmentRows.filter(r=>r.source_document_number===entry.number);
   for(const row of reviewedRows.filter(r=>!r.path_via)){assert.equal(row.evidence_excerpt,entry.excerpt);assert.deepEqual(row.applicability_conditions,entry.conditions);}
   const equipmentReference=entry.references.find(r=>r.key===entry.conditions.equipment_key);assert.ok(equipmentReference,'Every automatic equipment key must have a reviewed component node');
   for(const reference of entry.references){const row=reviewedRows.find(r=>r.path_via&&r.basis_key===reference.key);assert.ok(row);assert.equal(row.relationship_type,reference.relationship??'references');assert.equal(row.evidence_excerpt,reference.excerpt);assert.deepEqual(row.applicability_conditions,reference.conditions);}
  }
  const graphCount=(await query('select count(*)::integer n from public.relationships')).rows[0].n;await query('select public.review_pa28_batch5_graph()');assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,graphCount);
  await query('update public.related_document_matches set is_active=false where version_id=$1',[equipmentIds[0]]);
  assert.equal((await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[equipmentIds]))).rows.length,16,'Changed equipment AD hides its two model paths and all scoped component/reference paths');
  console.log('Installed-equipment checks passed: exact manifest parity, canonical component nodes, model scope, equipment predicates, supersession, repeat review and inactive-source boundaries.');

  const batch6=JSON.parse(readFileSync(new URL('../apps/worker/src/review-batch6.json',import.meta.url)));const publicationIds=[];
  await assert.rejects(asRole('anon',null,()=>query('select public.review_pa28_batch6_graph()')),/permission denied/);
  await assert.rejects(query('select public.review_pa28_batch6_graph()'),/publication missing/);
  for(const entry of batch6){
   const document=(await query("insert into public.documents(authority,document_type,document_number,title,is_published) values('FAA','AD',$1,$1,true) returning id",[entry.number])).rows[0].id;
   const version=(await query("insert into public.document_versions(document_id,source_version_id,revision_label,status,source_url,retrieved_at,content_sha256,storage_path,metadata,is_published) values($1,$2,'final publication','current','https://drs.faa.gov',now(),$3,$4,$5,true) returning id",[document,entry.number,entry.hash,'FAA/AD/reviewed/'+entry.hash+'.pdf',JSON.stringify({original_source_url:entry.published_url,original_source_kind:'final_federal_register'})])).rows[0].id;publicationIds.push(version);
   for(const model of entry.models)await query("insert into public.related_document_matches(source,version_id,model) values('test-batch6',$1,$2)",[version,model]);
  }
  assert.equal((await query('select public.review_pa28_batch6_graph() as n')).rows[0].n,16);
  const publicationRows=(await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[publicationIds]))).rows;
  assert.equal(publicationRows.length,26);assert.equal(publicationRows.filter(r=>!r.path_via).length,6);assert.equal(publicationRows.filter(r=>r.relationship_type==='affects_component').length,6);
  for(const entry of batch6){
   const reviewedRows=publicationRows.filter(r=>r.source_document_number===entry.number);
   for(const row of reviewedRows.filter(r=>!r.path_via)){assert.equal(row.evidence_excerpt,entry.excerpt);assert.deepEqual(row.applicability_conditions,entry.conditions);assert.equal(row.original_source_url,entry.published_url);}
   for(const reference of entry.references){const row=reviewedRows.find(r=>r.path_via&&r.basis_key===reference.key);assert.ok(row);assert.equal(row.relationship_type,reference.relationship??'references');assert.equal(row.evidence_excerpt,reference.excerpt);assert.deepEqual(row.applicability_conditions,reference.conditions);}
  }
  const publicationCount=(await query('select count(*)::integer n from public.relationships')).rows[0].n;await query('select public.review_pa28_batch6_graph()');assert.equal((await query('select count(*)::integer n from public.relationships')).rows[0].n,publicationCount);
  await query('update public.related_document_matches set is_active=false where version_id=$1',[publicationIds[0]]);
  assert.equal((await asRole('anon',null,()=>query('select * from public.model_graph where evidence_version_id=any($1::uuid[])',[publicationIds]))).rows.length,18,'Changed publication hides its two model paths and all scoped references');
  console.log('Garmin publication checks passed: modern and legacy provenance, exact manifest parity, alternative configuration paths, repeat review and inactive-source boundaries.');

  console.log('Source-change checks passed: baseline semantics, traceable corrections, idempotence, rollback, index absence, evidence publication and core-RPC isolation.');
  console.log('Dependency checks passed: immutable originals, private review, idempotent edges, directed traversal, publication RLS, and inactive-source boundaries.');
  console.log('Related-source checks passed: publication RLS, candidate semantics, complete-index replacement, repeat imports, rollback, private writes, and edition boundaries.');
  console.log('Importer transaction checks passed: private RPC, stable evidence IDs, deduplication, correction history, rollback, checkpoint integrity, stale-run rejection.');
  console.log('Database checks passed: migrations, idempotent seed, search, publication/review RLS, importer isolation, current-version integrity, private watchlists, private source bucket.');
} finally { await db.close(); }
