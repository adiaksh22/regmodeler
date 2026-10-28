import test from 'node:test';
import assert from 'node:assert/strict';
import {review,validateBoeingReview,reviewBoeingAd} from '../src/review-boeing-ad.mjs';
const record={'drs:documentNumber':review.number,'drs:status':'Current','drs:adfrawdCitationPublishDate':review.publication_date,'drs:adfrawdModel':['737-8','737-9'],documentURL:review.source_url};
test('Boeing source review rejects changed model scope, publication identity and bytes',()=>{
  assert.throws(()=>validateBoeingReview({...record,'drs:status':'Historical'},Buffer.from('%PDF-')),/REVIEWED_RECORD_MISMATCH/);
  assert.throws(()=>validateBoeingReview({...record,'drs:adfrawdModel':['737-8']},Buffer.from('%PDF-')),/REVIEWED_RECORD_MISMATCH/);
  assert.throws(()=>validateBoeingReview({...record,documentURL:review.source_url+'X'},Buffer.from('%PDF-')),/REVIEWED_RECORD_MISMATCH/);
  assert.throws(()=>validateBoeingReview(record,Buffer.from('%PDF-changed')),/REVIEWED_SOURCE_MISMATCH/);
});
test('Boeing review uses one exact AD query and refuses incomplete targeted results',async()=>{
  let calls=0;
  await assert.rejects(reviewBoeingAd(null,{metadata:async(type,filters)=>{calls++;assert.equal(type,'ADFRAWD');assert.deepEqual(filters,{'drs:documentNumber':[review.number]});return {documents:[record],summary:{hasMoreItems:true,totalItems:2}};}},{verifyOnly:true}),/INCOMPLETE_TARGETED_SOURCE/);
  assert.equal(calls,1);
});
