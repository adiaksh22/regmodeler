import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {collectRelated} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
import {archiveAttachment} from './review-expanded.mjs';
import {publishedOriginal} from './published-original.mjs';
import {verifyPiperReference} from './piper-source.mjs';
const reviewed=JSON.parse(readFileSync(new URL('./review-batch4.json',import.meta.url)));
export async function reviewBatch4(client,source){
 const publisher=reviewed.flatMap(e=>e.references).filter(r=>r.publisher_id);
 const verified=await Promise.allSettled(publisher.map(r=>verifyPiperReference(r)));const failed=verified.find(r=>r.status==='rejected');if(failed)throw failed.reason;
 for(const type of new Set(reviewed.map(e=>e.type))){
  const records=await collectRelated(source,type);
  for(const entry of reviewed.filter(e=>e.type===type)){
   const record=records.find(r=>r['drs:documentNumber']===entry.number&&r['drs:status']==='Current');if(!record)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
   const bytes=entry.published_url?await publishedOriginal(record,entry.published_url):await source.pdf(record.mainDocumentDownloadURL);
   const material=entry.published_url?{original_source_url:entry.published_url,original_source_kind:'final_federal_register',original_publication_date:record['drs:adfrawdCitationPublishDate']}:{};
   const version=await archiveReviewedSource(client,type,record,bytes,entry.hash,material);
   if(entry.attachment_name){
    const inventory=await source.attachments(record.otherAttachmentDetailsUrl);const files=inventory.otherAttachmentDownloadDetails;
    if(!Array.isArray(files)||files.length!==1||files[0].fileName!==entry.attachment_name)throw new ImportError('ATTACHMENT_INVENTORY_CHANGED');
    const bytes=await source.attachment(files[0].fileDownloadURL);await archiveAttachment(client,version,files[0],bytes,sha256(bytes));
    const complete=await client.rpc('complete_attachment_check',{p_version:version,p_count:1});if(complete.error)throw new ImportError('ATTACHMENT_CHECK_FAILED');
   }else if(record.hasMoreAttachments)throw new ImportError('ATTACHMENT_INVENTORY_CHANGED');
  }
 }
 const result=await client.rpc('review_pa28_batch4_graph');if(result.error)throw new ImportError('BATCH4_GRAPH_REVIEW_FAILED');return {reviewedOriginals:reviewed.length,archivedAttachments:reviewed.filter(e=>e.attachment_name).length,verifiedPublisherLinks:publisher.length,connections:result.data};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const config=readWorkerConfig(process.env);const c=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(45000)})}});console.log(JSON.stringify(await reviewBatch4(c,drsClient(process.env.FAA_DRS_API_KEY))));}
 catch(e){console.error(JSON.stringify({status:'failed',code:e instanceof ImportError?e.code:'SOURCE_REVIEW_FAILED'}));process.exitCode=1;}
}
