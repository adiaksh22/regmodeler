import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedOriginal,validatePublishedOriginal} from '../src/published-original.mjs';
const record={documentURL:'https://drs.faa.gov/browse/excelExternalWindow/FR-ADFRAWD-2024-11143-0000000000.0001','drs:adfrawdCitationPublishDate':'2024-05-22'};
const url='https://www.govinfo.gov/content/pkg/FR-2024-05-22/pdf/2024-11143.pdf';
test('published original binds the final-publication URL to the FAA document identity and date',()=>{
 assert.equal(validatePublishedOriginal(record,url).href,url);
 for(const other of [url.replace('2024-05-22','2024-05-23'),url.replace('2024-11143.pdf','2024-11144.pdf'),url.replace('www.govinfo.gov','untrusted.example'),url+'?download=1',url.replace('https://','http://'),url.replace('www.govinfo.gov','user:pass@www.govinfo.gov')])assert.throws(()=>validatePublishedOriginal(record,other),/PUBLICATION_IDENTITY_MISMATCH/);
 assert.throws(()=>validatePublishedOriginal({...record,documentURL:'https://drs.faa.gov/browse/excelExternalWindow/OTHER.0001'},url),/PUBLICATION_IDENTITY_MISMATCH/);
});
test('GovInfo reads use no FAA credentials and reject non-PDF content and oversized streams',async()=>{
 const bytes=await publishedOriginal(record,url,{request:async(target,options)=>{assert.equal(target.href,url);assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');return new Response('%PDF-test');}});assert.equal(bytes.toString(),'%PDF-test');
 await assert.rejects(publishedOriginal(record,url,{request:async()=>new Response('<html>not a PDF</html>')}),/INVALID_PDF/);
 await assert.rejects(publishedOriginal(record,url,{request:async()=>new Response('missing',{status:404})}),/PUBLICATION_UNAVAILABLE/);
 await assert.rejects(publishedOriginal(record,url,{request:async()=>new Response(new Uint8Array(25_000_001))}),/SOURCE_FILE_TOO_LARGE/);
});
