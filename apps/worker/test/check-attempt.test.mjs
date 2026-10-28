import test from 'node:test';
import assert from 'node:assert/strict';
import {ImportError} from '../src/drs.mjs';
import {metadataCheck} from '../src/check-attempt.mjs';
import {checkRelated} from '../src/related.mjs';
import {checkTcdsFamily} from '../src/import-tcds-family.mjs';
test('delta failures are recorded without checkpoint writes or raw error messages',async()=>{
 const failures=[];const db={from:table=>{assert.equal(table,'ingestion_runs');return {insert:async row=>{failures.push(row);return {};}};}};
 await assert.rejects(metadataCheck(db,'FAA:STC:PA28',async()=>{throw Error('secret-key-in-message');}),/SOURCE_CHECK_FAILED/);
 assert.equal(failures[0].status,'failed');assert.equal(failures[0].error_code,'SOURCE_CHECK_FAILED');assert.ok(!JSON.stringify(failures).includes('secret-key'));
 await assert.rejects(metadataCheck(db,'FAA:STC:PA28',async()=>{throw new ImportError('FAA_HTTP_429');}),/FAA_HTTP_429/);
 assert.equal(failures[1].error_code,'FAA_HTTP_429');
 assert.equal(await metadataCheck(db,'FAA:STC:PA28',async()=>42),42);assert.equal(failures.length,2,'Successful delta checks keep their single existing heartbeat');
});
test('both TCDS and related delta read failures enter monitoring',async()=>{
 const failures=[];const db={from:table=>table==='ingestion_runs'?{insert:async row=>{failures.push(row);return {};}}:{select:()=>({eq:()=>({maybeSingle:async()=>({error:{message:'private backend error'}})})})}};
 await assert.rejects(checkRelated(db,{},'STC'),/CHECKPOINT_READ_FAILED/);
 await assert.rejects(checkTcdsFamily(db,{},'A16WE'),/CHECKPOINT_READ_FAILED/);
 assert.deepEqual(failures.map(row=>row.source),['FAA:STC:PA28','FAA:TCDSMODEL:A16WE']);
});
