import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {review,validateRevision83,reviewRevision83} from '../src/review-boeing-revision83.mjs';
const record=()=>({documentURL:review.source_url,'drs:documentNumber':'A16WE','drs:status':'Current','drs:tcdsmodelRevisionNumber':'83','drs:tcdsmodelRevisionDate':review.date,'drs:tcdsmodelModel':review.models});

test('Revision 83 review refuses other originals, dates, statuses and model inventories',()=>{
 for(const changed of [{documentURL:'https://drs.faa.gov/browse/excelExternalWindow/OTHER.0001'},{'drs:documentNumber':'2A13'},{'drs:status':'Historical'},{'drs:tcdsmodelRevisionDate':'2026-11-12'},{'drs:tcdsmodelModel':review.models.slice(1)},{'drs:tcdsmodelModel':[...review.models,review.models[0]]},{'drs:tcdsmodelRevisionNumber':'84'}])assert.throws(()=>validateRevision83({...record(),...changed},Buffer.from('%PDF-fixture')),/REVIEWED_RECORD_MISMATCH/);
 assert.throws(()=>validateRevision83(record(),Buffer.from('%PDF-changed')),/REVIEWED_SOURCE_MISMATCH/);
 assert.throws(()=>validateRevision83(record(),Buffer.from('not a PDF')),/REVIEWED_SOURCE_MISMATCH/);
});

test('Revision 83 review rejects malformed or incomplete metadata before downloading',async()=>{
 let downloads=0;
 for(const result of [{},{summary:{hasMoreItems:true,totalItems:1},documents:[record()]},{summary:{hasMoreItems:false,totalItems:2},documents:[record()]},{summary:{totalItems:1},documents:[record()]},{summary:{hasMoreItems:false,totalItems:'1'},documents:[record()]}]){
  await assert.rejects(reviewRevision83(null,{tcdsPage:async()=>result,pdf:async()=>{downloads++;}}),/INCOMPLETE_TARGETED_SOURCE/);
 }
 assert.equal(downloads,0);
});

test('Revision 83 review requires exactly one current original',async()=>{
 for(const documents of [[],[{...record(),'drs:status':'Historical'}],[record(),record()]])await assert.rejects(reviewRevision83(null,{tcdsPage:async()=>({summary:{hasMoreItems:false,totalItems:documents.length},documents})}),/REVIEWED_RECORD_UNAVAILABLE/);
});

test('Revision 83 changed PDF bytes cannot reach privileged database writes',async()=>{
 let writes=0;
 await assert.rejects(reviewRevision83({from:()=>{writes++;},rpc:()=>{writes++;}},{tcdsPage:async()=>({summary:{hasMoreItems:false,totalItems:1},documents:[record()]}),pdf:async()=>Buffer.from('%PDF-other')}),/REVIEWED_SOURCE_MISMATCH/);
 assert.equal(writes,0);
});

test('Revision 83 SQL and manifest agree on source, seven profiles and conditional limits',()=>{
 const sql=readFileSync(new URL('../../../supabase/migrations/20261116000100_boeing_revision83_review.sql',import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(sql.match(/\$variants\$(.*?)\$variants\$/s)[1]),review.variants);
 for(const value of [review.hash,review.source_url,review.date,"revision_label='83'",'path_count<>41'])assert.ok(sql.includes(value));
 assert.equal(review.models.length,17);assert.equal(review.variants.length,7);
 assert.match(review.variants.find(row=>row.key==='737-10').passenger_condition,/Type C/);
 assert.match(review.variants.find(row=>row.key==='737-7').passenger_condition,/both automatic-overwing-exit pairs/);
});
