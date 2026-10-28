import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stcResolution,issueSources,validateResolutionSource,reviewStcResolution} from '../src/review-stc-resolution.mjs';
const record=entry=>({'drs:documentNumber':entry.number,'drs:status':'Current',documentURL:entry.source_url,'drs:stcTCNumbersMakeModel':['A16WE -- Boeing -- 737-700 Series','A16WE -- Boeing -- 737-800 Series'],hasMoreAttachments:false});
test('resolution keeps SA and ST identities distinct and refuses changed originals',()=>{
 const entry=stcResolution[0];
 assert.throws(()=>validateResolutionSource(entry,{...record(entry),'drs:documentNumber':'SA04009NY'},Buffer.from('%PDF-')),/STC_RESOLUTION_SCOPE_MISMATCH/);
 assert.throws(()=>validateResolutionSource(entry,record(entry),Buffer.from('%PDF-wrong')),/STC_RESOLUTION_ORIGINAL_MISMATCH/);
 assert.equal(issueSources[0].number,'SA04009NY');assert.equal(entry.number,'ST04009NY');
});
test('resolution downloads no history and rejects incomplete targeted responses before database writes',async()=>{
 await assert.rejects(reviewStcResolution(null,{metadata:async(type,filters)=>{assert.equal(type,'STC');assert.deepEqual(filters,{'drs:documentNumber':['ST04009NY']});return {documents:[],summary:{hasMoreItems:true,totalItems:2,count:0}};}},{verifyOnly:true}),/INCOMPLETE_TARGETED_SOURCE/);
});
test('STC SQL manifest and model-specific maintenance scope match worker evidence',()=>{
 const sql=readFileSync(new URL('../../../supabase/migrations/20261027000600_boeing_stc_resolution.sql',import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(sql.split('$review$')[1]),stcResolution);
 const supplements=stcResolution[1].references.filter(row=>row.key.startsWith('MMS:'));
 assert.deepEqual(supplements.map(row=>row.models),[['737-700'],['737-800']]);
});
