import test from 'node:test';
import assert from 'node:assert/strict';
import { collectTcds, drsClient, snapshot } from '../src/drs.mjs';
import { importPa28 } from '../src/import-tcds.mjs';

function record(id = 'TEST', overrides = {}) {
  return {
    'drs:documentNumber':'2A13','drs:status':'Current','drs:tcdsmodelRevisionNumber':'66',
    'drs:tcdsmodelRevisionDate':'2025-10-10','drs:tcdsmodelModel':['PA-28-140'],
    documentGuid:id,documentURL:`https://drs.faa.gov/browse/excelExternalWindow/${id}.0001`,
    docLastModifiedDate:'2025-12-15T18:03:54.151Z',mainDocumentDownloadURL:'https://drs.faa.gov/api/drs/data-pull/download/test',
    ...overrides,
  };
}
function page(documents, offset=0, more=false, total=documents.length) {
  return {documents,summary:{count:documents.length,offset,hasMoreItems:more,totalItems:total}};
}
test('paginates with offsets and fails on changing totals or duplicate records',async()=>{
  const rows=Array.from({length:750},(_,i)=>record(`DOC${i}`));
  const offsets=[];
  const result=await collectTcds({page:async offset=>{offsets.push(offset);return offset ? page([record('LAST')],750,false,751) : page(rows,0,true,751);}});
  assert.equal(result.length,751);assert.deepEqual(offsets,[0,750]);
  await assert.rejects(collectTcds({page:async offset=>offset ? page([rows[0]],750,false,751):page(rows,0,true,751)}),/DUPLICATE_PAGE_RECORD/);
  await assert.rejects(collectTcds({page:async offset=>offset ? page([],750,false,752):page(rows,0,true,751)}),/CATALOG_CHANGED/);
});
test('rejects incomplete pages, unscoped records, invalid incremental results and truncated catalogs',async()=>{
  for (const payload of [page([record()],0,true,2),page([record('BAD',{'drs:documentNumber':'OTHER'})]),page([record()],0,false,2)]) {
    await assert.rejects(collectTcds({page:async()=>payload}));
  }
  await assert.rejects(collectTcds({page:async()=>page([record()])},'2026-01-01T00:00:00Z'),/INCREMENTAL_FILTER_MISMATCH/);
});
test('uses documented filtered POST and retries transient failures without leaking the key',async()=>{
  const requests=[];let attempts=0;
  const source=drsClient('test-key',{sleep:async()=>{},request:async(url,init)=>{
    requests.push({url:String(url),init});attempts++;
    return attempts===1 ? new Response('',{status:503}) : Response.json(page([record()]));
  }});
  await source.page(750,'2025-01-01T00:00:00Z');
  assert.equal(attempts,2);assert.equal(requests[1].init.redirect,'error');
  assert.deepEqual(JSON.parse(requests[1].init.body),{offset:750,sortOrder:'ASC',docLastModifiedDate:'2025-01-01T00:00:00Z',documentFilters:{'drs:documentNumber':['2A13']}});
  let denied=0;
  await assert.rejects(drsClient('test-key',{request:async()=>{denied++;return new Response('',{status:403});}}).page(),/FAA_HTTP_403/);
  assert.equal(denied,1);
});
test('refuses credential forwarding, HTML masquerading as PDF and oversized content',async()=>{
  let calls=0;
  const source=drsClient('test-key',{request:async()=>{calls++;return new Response('<html>error</html>');}});
  await assert.rejects(source.pdf('https://example.com/file'),/UNTRUSTED_SOURCE_URL/);
  await assert.rejects(source.pdf('https://attacker@drs.faa.gov/api/drs/data-pull/download/id'),/UNTRUSTED_SOURCE_URL/);
  assert.equal(calls,0);
  await assert.rejects(source.pdf(record().mainDocumentDownloadURL),/INVALID_PDF/);
  await assert.rejects(drsClient('test-key',{request:async()=>new Response(Buffer.alloc(25_000_001))}).pdf(record().mainDocumentDownloadURL),/SOURCE_FILE_TOO_LARGE/);
});
test('snapshots deduplicate identical content and retain metadata/PDF corrections',()=>{
  const bytes=Buffer.from('%PDF-1.7\nfixture');
  const a=snapshot(record(),bytes,'2026-10-13T00:00:00Z');
  const b=snapshot(record(),bytes,'2026-10-14T00:00:00Z');
  assert.equal(a.metadata.snapshot_sha256,b.metadata.snapshot_sha256);
  const changed=snapshot(record('TEST',{'drs:tcdsmodelTCHolder':'Changed holder'}),bytes,b.retrieved_at);
  assert.notEqual(a.metadata.snapshot_sha256,changed.metadata.snapshot_sha256);
  assert.notEqual(a.metadata.snapshot_sha256,snapshot(record(),Buffer.from('%PDF-1.7\nchanged'),b.retrieved_at).metadata.snapshot_sha256);
});
test('a failed archive never commits or advances the checkpoint and records a sanitized failure',async()=>{
  let committed=false;let failure;
  const db={from:()=>({insert:()=>({select:()=>({single:async()=>({data:{id:'run'}})})}),update:value=>({eq:()=>({eq:async()=>{failure=value;}})})}),
    storage:{from:()=>({upload:async()=>({error:{statusCode:'500'}})})},rpc:async()=>{committed=true;}};
  const source={page:async()=>page([record()]),pdf:async()=>Buffer.from('%PDF-1.7\nfixture')};
  await assert.rejects(importPa28(db,source),/SOURCE_ARCHIVE_FAILED/);
  assert.equal(committed,false);assert.equal(failure.error_code,'SOURCE_ARCHIVE_FAILED');assert.equal(failure.status,'failed');
});
test('incremental mismatch fails before downloads and verification mode needs no database',async()=>{
  let downloaded=false;
  const source={page:async(_offset,since)=>page(since?[]:[record()]),pdf:async()=>{downloaded=true;}};
  await assert.rejects(importPa28(null,source,{verifyOnly:true}),/INCREMENTAL_RECONCILIATION_MISMATCH/);
  assert.equal(downloaded,false);
  const verified=await importPa28(null,{page:async()=>page([record()])},{verifyOnly:true});
  assert.equal(verified.positiveIncrementalRecords,1);
});
test('a complete repeat import verifies existing archive bytes before committing',async()=>{
  const objects=new Map();const batches=[];
  const db={from:()=>({insert:()=>({select:()=>({single:async()=>({data:{id:'run'}})})}),update:()=>({eq:()=>({eq:async()=>{}})})}),
    storage:{from:()=>({upload:async(path,bytes)=>{
      if(objects.has(path))return {error:{statusCode:'409'}};
      objects.set(path,bytes);return {error:null};
    },download:async path=>({data:new Blob([objects.get(path)]),error:null})})},
    rpc:async(_name,args)=>{batches.push(args.p_records);return {data:args.p_records.length,error:null};}};
  const source={page:async()=>page([record()]),pdf:async()=>Buffer.from('%PDF-1.7\nfixture')};
  await importPa28(db,source);await importPa28(db,source);
  assert.equal(objects.size,2);assert.equal(batches.length,2);
  assert.equal(batches[0][0].metadata.snapshot_sha256,batches[1][0].metadata.snapshot_sha256);
  assert.equal(batches[0][0].metadataBytes,undefined);
});
