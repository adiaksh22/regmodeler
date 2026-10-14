import test from 'node:test';import assert from 'node:assert/strict';
import {sha256} from '../src/drs.mjs';import {verifyPiperReference} from '../src/piper-source.mjs';
const bytes=Buffer.from('%PDF-reviewed publisher fixture');
const reference={key:'SB:1309A:2018-03-06',publisher_id:'19055',conditions:{publisher_url:'https://s3.amazonaws.com/pipercrm/Solution/19055/SB_1309A.pdf',publisher_sha256:sha256(bytes)}};
function request(change={}){return async(url,options)=>{assert.equal(options.headers?.['x-api-key'],undefined);assert.equal(options.redirect,'error');return String(url).includes('admin-ajax')?Response.json([{file_url:reference.conditions.publisher_url,pub_reference_num:'SB 1309A',pub_release_date:'2018-03-06',...change}]):new Response(bytes);};}
test('publisher verification binds the dated catalog entry to exact PDF bytes without FAA credentials',async()=>{
 assert.equal((await verifyPiperReference(reference,{request:request()})).sha256,sha256(bytes));
 for(const change of [{file_url:'https://untrusted.example/file.pdf'},{pub_reference_num:'SL 1309A'},{pub_release_date:'2025-04-15'}])await assert.rejects(verifyPiperReference(reference,{request:request(change)}),/PUBLISHER_IDENTITY_MISMATCH/);
 await assert.rejects(verifyPiperReference({...reference,publisher_id:'19038'},{request:request()}),/PUBLISHER_IDENTITY_MISMATCH/);
 await assert.rejects(verifyPiperReference({...reference,conditions:{...reference.conditions,publisher_sha256:'a'.repeat(64)}},{request:request()}),/PUBLISHER_CONTENT_CHANGED/);
});
