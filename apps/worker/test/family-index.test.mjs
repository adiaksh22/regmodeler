import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {review} from '../src/review-boeing-revision82.mjs';
import {reviewFamilyIndex} from '../src/review-boeing-family-index.mjs';
test('family index promotion retains exact original and model-list guard',()=>{
 const sql=readFileSync(new URL('../../../supabase/migrations/20261103000300_boeing_family_index.sql',import.meta.url),'utf8');
 assert.ok(sql.includes(review.hash));assert.ok(sql.includes(review.source_url));
 const models=JSON.parse(sql.match(/@> '(\[.*?\])'::jsonb/)[1]);assert.deepEqual(models.sort(),review.models);
});
test('family index worker cannot publish with a changed FAA original',async()=>{
 let commits=0;
 const record={documentURL:review.source_url,'drs:documentNumber':'A16WE','drs:status':'Current','drs:tcdsmodelRevisionNumber':'82','drs:tcdsmodelRevisionDate':review.date,'drs:tcdsmodelModel':review.models};
 await assert.rejects(reviewFamilyIndex({rpc:async()=>{commits++;}},{tcdsPage:async()=>({summary:{hasMoreItems:false,totalItems:1},documents:[record]}),pdf:async()=>Buffer.from('%PDF-changed')}),/REVIEWED_SOURCE_MISMATCH/);
 assert.equal(commits,0);
});
