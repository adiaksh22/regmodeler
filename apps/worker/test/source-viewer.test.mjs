import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSourceRequest } from '../../../supabase/functions/source-viewer/handler.mjs';
const id='10000000-0000-4000-8000-000000000001';const hash='a'.repeat(64);
const origin='https://example.supabase.co';
const request=(body={versionId:id})=>new Request(origin+'/functions/v1/source-viewer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function fixture(overrides={}){
 let signed=0;
 const record={is_published:true,storage_path:`FAA/TCDS/2A13/${hash}.pdf`,content_sha256:hash,document:{is_published:true,authority:'FAA',document_type:'TCDS'},...overrides};
 const client={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:record,error:null})})})}),storage:{from:()=>({createSignedUrl:async(path,expires)=>{signed++;assert.equal(path,record.storage_path);assert.equal(expires,300);return {data:{signedUrl:origin+'/storage/v1/object/sign/approved.pdf?token=test'},error:null};}})}};
 return {client,signed:()=>signed};
}
test('viewer signs only the selected published FAA PDF with a bounded expiry',async()=>{
 const f=fixture();const response=await handleSourceRequest(request(),f.client,origin);
 assert.equal(response.status,200);assert.equal(f.signed(),1);assert.equal((await response.json()).expiresIn,300);
});
test('viewer refuses drafts, metadata objects, wrong authorities and mismatched PDF hashes',async()=>{
 for(const change of [{is_published:false},{document:{is_published:false,authority:'FAA',document_type:'TCDS'}},{storage_path:'FAA/TCDS/2A13/metadata.json'},{storage_path:`FAA/TCDS/2A13/${'b'.repeat(64)}.pdf`},{document:{is_published:true,authority:'PRIVATE',document_type:'TCDS'}}]){
  const f=fixture(change);assert.equal((await handleSourceRequest(request(),f.client,origin)).status,404);assert.equal(f.signed(),0);
 }
});
test('viewer rejects invalid IDs, oversized requests and unsupported methods',async()=>{
 const f=fixture();assert.equal((await handleSourceRequest(request({versionId:'not-a-uuid'}),f.client,origin)).status,400);
 assert.equal((await handleSourceRequest(request({versionId:id,extra:'x'.repeat(5000)}),f.client,origin)).status,413);
 assert.equal((await handleSourceRequest(new Request(origin),f.client,origin)).status,405);assert.equal(f.signed(),0);
 const malformed=new Request(origin,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
 assert.equal((await handleSourceRequest(malformed,f.client,origin)).status,400);
 assert.equal((await handleSourceRequest(request(null),f.client,origin)).status,400);
});
test('attachment viewer binds a PDF to its published parent and refuses HTML and wrong paths',async()=>{
 const attachmentId='20000000-0000-4000-8000-000000000001';
 for(const [change,status] of [[{},200],[{version_id:attachmentId},404],[{mime_type:'text/plain'},404],[{storage_path:'arbitrary.pdf'},404]]){
  const parent=fixture();const original=parent.client.from;
  parent.client.from=table=>table==='source_attachments'?{select:()=>{const query={eq:()=>query,maybeSingle:async()=>({data:{version_id:id,mime_type:'application/pdf',content_sha256:hash,storage_path:`FAA/ATTACHMENT/reviewed/${hash}.pdf`,...change},error:null})};return query;}}:original(table);
  let signed=0;parent.client.storage.from=()=>({createSignedUrl:async path=>{signed++;assert.equal(path,`FAA/ATTACHMENT/reviewed/${hash}.pdf`);return {data:{signedUrl:origin+'/storage/v1/object/sign/attachment.pdf'},error:null};}});
  assert.equal((await handleSourceRequest(request({versionId:id,attachmentId}),parent.client,origin)).status,status);assert.equal(signed,status===200?1:0);
 }
});
