import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ngReview,validateNgRecord,reviewBoeingNg} from '../src/review-boeing-ng.mjs';
const record=entry=>({'drs:documentNumber':entry.number,'drs:status':'Current',documentURL:entry.source_url,'drs:adfrawdCitationPublishDate':entry.publication_date,'drs:adfrawdModel':['737-700 Series','737-800 Series'],'drs:stcTCNumbersMakeModel':['A16WE -- Boeing -- 737-700 Series','A16WE -- Boeing -- 737-800 Series'],hasMoreAttachments:false});
test('NG review binds model tuples, source identity and attachment inventory',()=>{
 for(const entry of ngReview)assert.doesNotThrow(()=>validateNgRecord(entry,record(entry)));
 const stc=ngReview[1];
 assert.throws(()=>validateNgRecord(stc,{...record(stc),'drs:stcTCNumbersMakeModel':['OTHER -- Boeing -- 737-700 Series','A16WE -- Boeing -- 737-800 Series']}),/NG_REVIEW_SCOPE_MISMATCH/);
 assert.throws(()=>validateNgRecord(stc,{...record(stc),'drs:documentNumber':'ST01635LA'}),/NG_REVIEW_SCOPE_MISMATCH/);
 assert.throws(()=>validateNgRecord(stc,{...record(stc),hasMoreAttachments:true}),/NG_REVIEW_SCOPE_MISMATCH/);
});
test('NG worker uses named requests and refuses incomplete metadata before archiving',async()=>{
 await assert.rejects(reviewBoeingNg(null,{metadata:async(type,filters)=>{assert.equal(type,'ADFRAWD');assert.deepEqual(filters,{'drs:documentNumber':['2001-14-05']});return {documents:[],summary:{count:0,totalItems:1,hasMoreItems:false}};}},{verifyOnly:true}),/INCOMPLETE_TARGETED_SOURCE/);
});
test('NG SQL evidence manifest exactly matches the worker manifest',()=>{
 const sql=readFileSync(new URL('../../../supabase/migrations/20261027000300_boeing_ng_review.sql',import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(sql.split('$review$')[1]),ngReview);
});
