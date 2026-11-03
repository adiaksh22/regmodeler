import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {review,validateRevision82,reviewRevision82} from '../src/review-boeing-revision82.mjs';
const record=()=>({documentURL:review.source_url,'drs:documentNumber':'A16WE','drs:status':'Current','drs:tcdsmodelRevisionNumber':'82','drs:tcdsmodelRevisionDate':review.date,'drs:tcdsmodelModel':review.models});
test('Revision 82 review rejects changed identity, status, model list and original bytes',()=>{
 for(const changed of [{documentURL:'https://drs.faa.gov/browse/excelExternalWindow/OTHER.0001'},{'drs:status':'Historical'},{'drs:tcdsmodelModel':review.models.filter(model=>model!=='737-10')},{'drs:tcdsmodelRevisionNumber':'83'}])assert.throws(()=>validateRevision82({...record(),...changed},Buffer.from('%PDF-fixture')),/REVIEWED_RECORD_MISMATCH/);
 assert.throws(()=>validateRevision82(record(),Buffer.from('%PDF-changed')),/REVIEWED_SOURCE_MISMATCH/);
});
test('review refuses incomplete certificate metadata before publication',async()=>{
 await assert.rejects(reviewRevision82(null,{tcdsPage:async()=>({summary:{hasMoreItems:true,totalItems:2},documents:[record()]})},{verifyOnly:true}),/INCOMPLETE_TARGETED_SOURCE/);
});
test('SQL review manifest matches the page-reviewed variant facts',()=>{
 const sql=readFileSync(new URL('../../../supabase/migrations/20261103000200_boeing_revision82_review.sql',import.meta.url),'utf8');
 assert.deepEqual(JSON.parse(sql.match(/\$variants\$(.*?)\$variants\$/s)[1]),review.variants);
 assert.ok(sql.includes(review.hash));assert.ok(sql.includes(review.source_url));
 const max10=review.variants.find(row=>row.key==='737-10');assert.equal(max10.passengers,230);assert.match(max10.passenger_condition,/Type C/);
 assert.ok(review.variants.filter(row=>row.key.startsWith('737-')&&!row.key.includes('Series')).every(row=>row.limits_page===68));
});
