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
test('publisher filenames may contain spaces; catalog release remains distinct from PDF edition',async()=>{
 const spaced={...reference,conditions:{...reference.conditions,publisher_url:'https://s3.amazonaws.com/pipercrm/Solution/19055/SB 1309A.pdf',publisher_catalog_date:'2018-03-15'}};
 const fetchFile=async(url)=>String(url).includes('admin-ajax')?Response.json([{file_url:spaced.conditions.publisher_url,pub_reference_num:'SB 1309A',pub_release_date:'2018-03-15'}]):new Response(bytes);
 await verifyPiperReference(spaced,{request:fetchFile});
 await assert.rejects(verifyPiperReference({...spaced,conditions:{...spaced.conditions,publisher_catalog_date:undefined}},{request:fetchFile}),/PUBLISHER_IDENTITY_MISMATCH/);
 for(const filename of ['../SB.pdf','SB.pdf?download=1','SB%201309A.pdf','SB.pdf#page=1'])await assert.rejects(verifyPiperReference({...spaced,conditions:{...spaced.conditions,publisher_url:'https://s3.amazonaws.com/pipercrm/Solution/19055/'+filename}},{request:fetchFile}),/PUBLISHER_IDENTITY_MISMATCH/);
});
