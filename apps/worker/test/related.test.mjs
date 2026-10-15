import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingModels,relatedSnapshot,collectRelated,importRelated,relatedSourceKey } from '../src/related.mjs';
import { extractReference } from '../src/reference-text.mjs';

const record=(id='TEST',more={})=>({'drs:documentNumber':'SA_TEST','drs:status':'Current','drs:stcTCNumbersMakeModel':['2A13 -- Piper -- PA-28-181'],documentGuid:id,documentURL:`https://drs.faa.gov/browse/excelExternalWindow/${id}.0001`,docLastModifiedDate:'2025-12-01T00:00:00Z',...more});
const page=(documents,offset=0,more=false,total=documents.length)=>({documents,summary:{count:documents.length,offset,hasMoreItems:more,totalItems:total}});
test('STC matches require the model and certificate to belong to the same tuple',()=>{
  assert.deepEqual(matchingModels('STC',{'drs:stcTCNumbersMakeModel':['2A13 -- Piper -- PA-28-140','OTHER -- Other -- PA-28-181']}),['PA-28-140']);
  assert.deepEqual(matchingModels('STC',{'drs:stcTCNumbers':['2A13','OTHER'],'drs:stcModel':['OTHER MODEL','PA-28-181']}),[]);
  assert.deepEqual(matchingModels('STC',{'drs:stcTCNumbers':['2A13'],'drs:stcModel':['PA-28-181','PA-28-140']}),[]);
});
test('Boeing scope maps FAA series names to certified model identities',async()=>{
  const stc={'drs:stcTCNumbersMakeModel':['A16WE -- The Boeing Company -- 737-800 Series','A16WE -- The Boeing Company -- 737-8','OTHER -- Other -- 737-9']};
  assert.deepEqual(matchingModels('STC',stc,'B737'),['737-800','737-8']);
  const ad=record('B737',{'drs:documentNumber':'2026-13-02','drs:adfrawdModel':['737-700 Series','737-900ER Series','737-9']});
  assert.deepEqual(matchingModels('AD',ad,'B737'),['737-700','737-900ER','737-9']);
  const calls=[];await collectRelated({metadata:async(type,filters)=>{calls.push({type,filters});return page([ad]);}},'AD',undefined,'B737');
  assert.deepEqual(calls,[{type:'ADFRAWD',filters:{'drs:adfrawdModel':['737-700 Series','737-800 Series','737-900ER Series','737-7','737-8','737-9']}}]);
  const snapshot=relatedSnapshot('AD',ad,'2026-10-14T00:00:00Z','B737');
  assert.match(snapshot.row.metadata.metadata_storage_path,/^FAA\/AD\/B737\//);
  assert.equal(relatedSourceKey('STC','B737'),'FAA:STC:B737');
  assert.throws(()=>relatedSourceKey('CAR','B737'),/UNSUPPORTED_DOCUMENT_TYPE/);
});
test('registry metadata is archived without asserting installation or PDF retrieval',()=>{
  const r=record('A',{'drs:stcTCNumbersMakeModel':['2A13 -- Piper -- PA-28-181']});
  const first=relatedSnapshot('STC',r,'2026-10-13T00:00:00Z');
  assert.equal(first.row.metadata.primary_pdf_pending,true);assert.match(first.row.metadata.candidate_reason,/not verified/);
  assert.deepEqual(first.row.models,['PA-28-181']);
  assert.equal(first.row.source_version_id,relatedSnapshot('STC',r,'2026-10-14T00:00:00Z').row.source_version_id);
  assert.notEqual(first.row.source_version_id,relatedSnapshot('STC',{...r,'drs:title':'Changed'},first.row.retrieved_at).row.source_version_id);
});
test('related discovery paginates and rejects incomplete or changed catalogs',async()=>{
  const first=Array.from({length:750},(_,i)=>record('DOC'+i));const calls=[];
  const source={metadata:async(_type,_filters,offset)=>{calls.push(offset);return offset?page([record('LAST')],750,false,751):page(first,0,true,751);}};
  assert.equal((await collectRelated(source,'STC')).length,751);assert.deepEqual(calls,[0,750]);
  await assert.rejects(collectRelated({metadata:async()=>page([record()],0,true,2)},'STC'),/INCOMPLETE_PAGE/);
  await assert.rejects(collectRelated({metadata:async()=>page([record()],0,false,2)},'STC'),/INCOMPLETE_CATALOG/);
});
test('verify mode checks a positive incremental response without a database',async()=>{
  const source={metadata:async()=>page([record()])};
  assert.equal((await importRelated(null,source,'STC',{verifyOnly:true})).positiveIncrementalRecords,1);
  await assert.rejects(importRelated(null,{metadata:async(_t,_f,_o,since)=>page(since?[]:[record()])},'STC',{verifyOnly:true}),/INCREMENTAL_RECONCILIATION_MISMATCH/);
});
test('full discovery retains undated legacy records but incremental filtering cannot include them',async()=>{
  const legacy=record('OLD',{docLastModifiedDate:null});
  assert.equal((await collectRelated({metadata:async()=>page([legacy])},'STC')).length,1);
  await assert.rejects(collectRelated({metadata:async()=>page([legacy])},'STC','2025-01-01T00:00:00Z'),/INCREMENTAL_FILTER_MISMATCH/);
  const source={metadata:async(_t,_f,_o,since)=>page(since?[record()]:[legacy,record()])};
  assert.equal((await importRelated(null,source,'STC',{verifyOnly:true})).undatedRecords,1);
});
test('XML reference rejects DTDs and wrong editions instead of pretending they match the cited amendment',()=>{
  assert.throws(()=>extractReference('<!DOCTYPE root [<!ENTITY x SYSTEM "file:///secret">]><root/>','2026-01-01'),/UNSAFE_REFERENCE_XML/);
  assert.throws(()=>extractReference('<CFRGRANULE><FDSYS><CFRTITLE>14</CFRTITLE><DATE>2020-01-01</DATE><GRANULENUM>23</GRANULENUM></FDSYS></CFRGRANULE>','2026-01-01'),/REFERENCE_EDITION_MISMATCH/);
  const sections=['23.207','23.221','23.955','23.959','23.1327','23.1547','23.1557'];
  const xml='<CFRGRANULE><FDSYS><CFRTITLE>14</CFRTITLE><DATE>2016-01-01</DATE><GRANULENUM>23</GRANULENUM></FDSYS><PART>'+sections.map(s=>`<SECTION><SECTNO>§ ${s}</SECTNO><SUBJECT>Title.</SUBJECT><P>A <E T="03">fuel</E> flow &amp; test.</P></SECTION>`).join('')+'</PART></CFRGRANULE>';
  const rows=extractReference(xml,'2026-01-01');assert.equal(rows.length,7);assert.equal(rows[0].source_kind,'later_reference');assert.match(rows[0].body_text,/A fuel flow & test/);
});
