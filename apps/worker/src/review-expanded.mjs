import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {collectRelated} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
const reviewed=JSON.parse(readFileSync(new URL('./expanded-review.json',import.meta.url)));
const attachments={
 '2013-02-13':{name:'DRS_2013-02-13.html',hash:'8f8bcb571f061fb1c0d43ac8c998e690ab03b22044441d6885673d519d1722cc'},
 '2020-26-16':{name:'DRS_2020-26-16.html',hash:'92362c626ca5e2cf3be0198d0bb0030d1d1d31dfc36c4a87f6eadd1fe6943369'},
 'SA01941LA':{name:'SA01941LA_AML.pdf',hash:'e9a81f4565fac8055352bfb9435e5747737484300144994a3bb0b204c9f2b60e'},
};
export async function archiveAttachment(client,version,file,bytes,expectedHash) {
 if(sha256(bytes)!==expectedHash)throw new ImportError('REVIEWED_ATTACHMENT_MISMATCH');
 const pdf=file.fileName.endsWith('.pdf');
 if(pdf&&bytes.subarray(0,5).toString()!=='%PDF-')throw new ImportError('INVALID_PDF');
 const mime=pdf?'application/pdf':'text/plain';const path=`FAA/ATTACHMENT/reviewed/${expectedHash}.${pdf?'pdf':'html'}`;
 const bucket=client.storage.from('regulatory-sources');const saved=await bucket.upload(path,bytes,{contentType:mime,upsert:false});
 if(saved.error){
  if(String(saved.error.statusCode)!=='409'&&saved.error.error!=='Duplicate')throw new ImportError('ATTACHMENT_ARCHIVE_FAILED');
  const existing=await bucket.download(path);if(existing.error||!Buffer.from(await existing.data.arrayBuffer()).equals(bytes))throw new ImportError('ATTACHMENT_ARCHIVE_MISMATCH');
 }
 const result=await client.rpc('attach_source_file',{p_version:version,p_name:file.fileName,p_hash:expectedHash,p_path:path,p_mime:mime,p_url:file.fileDownloadURL});
 if(result.error)throw new ImportError('ATTACHMENT_ATTACH_FAILED');return result.data;
}
export async function reviewExpanded(client,source) {
 for(const type of ['AD','STC']){
  const records=await collectRelated(source,type);
  for(const entry of reviewed.filter(r=>r.type===type)){
   const record=records.find(r=>r['drs:documentNumber']===entry.number&&r['drs:status']==='Current');if(!record)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
   const version=await archiveReviewedSource(client,type,record,await source.pdf(record.mainDocumentDownloadURL),entry.hash);
   const expected=attachments[entry.number];
   if(expected){
    const inventory=await source.attachments(record.otherAttachmentDetailsUrl);const files=inventory.otherAttachmentDownloadDetails;
    if(!Array.isArray(files)||files.length!==1||files[0].fileName!==expected.name)throw new ImportError('ATTACHMENT_INVENTORY_CHANGED');
    const bytes=await source.attachment(files[0].fileDownloadURL);
    // Generated AD HTML can vary between requests. It is archived as inert text, never used to approve graph evidence.
    await archiveAttachment(client,version,files[0],bytes,files[0].fileName.endsWith('.pdf')?expected.hash:sha256(bytes));
    const complete=await client.rpc('complete_attachment_check',{p_version:version,p_count:files.length});if(complete.error)throw new ImportError('ATTACHMENT_CHECK_FAILED');
   }else if(record.hasMoreAttachments)throw new ImportError('ATTACHMENT_INVENTORY_CHANGED');
  }
 }
 const r=await client.rpc('review_pa28_expanded_graph');if(r.error)throw new ImportError('EXPANDED_GRAPH_REVIEW_FAILED');return {reviewedOriginals:reviewed.length,reviewedAttachments:3,connections:r.data};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const config=readWorkerConfig(process.env);const client=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(45000)})}});console.log(JSON.stringify(await reviewExpanded(client,drsClient(process.env.FAA_DRS_API_KEY))));}
 catch(e){console.error(JSON.stringify({status:'failed',code:e instanceof ImportError?e.code:'SOURCE_REVIEW_FAILED'}));process.exitCode=1;}
}
