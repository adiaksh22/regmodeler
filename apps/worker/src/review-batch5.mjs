import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {collectRelated} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
import {archiveAttachment} from './review-expanded.mjs';
const reviewed=JSON.parse(readFileSync(new URL('./review-batch5.json',import.meta.url)));
export async function reviewBatch5(client,source){
 const records=await collectRelated(source,'AD');
 for(const entry of reviewed){
  const record=records.find(r=>r['drs:documentNumber']===entry.number&&r['drs:status']==='Current');if(!record)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
  const version=await archiveReviewedSource(client,'AD',record,await source.pdf(record.mainDocumentDownloadURL),entry.hash);
  const inventory=await source.attachments(record.otherAttachmentDetailsUrl);const files=inventory.otherAttachmentDownloadDetails;
  if(!Array.isArray(files)||files.length!==1||files[0].fileName!==entry.attachment_name)throw new ImportError('ATTACHMENT_INVENTORY_CHANGED');
  const bytes=await source.attachment(files[0].fileDownloadURL);
  // FAA-generated HTML contains a changing Akamai beacon. Archive each retrieval as inert text;
  // graph approval is pinned to the stable primary PDF, exact inventory and cited pages.
  await archiveAttachment(client,version,files[0],bytes,sha256(bytes));
  const complete=await client.rpc('complete_attachment_check',{p_version:version,p_count:1});if(complete.error)throw new ImportError('ATTACHMENT_CHECK_FAILED');
 }
 const result=await client.rpc('review_pa28_batch5_graph');if(result.error)throw new ImportError('BATCH5_GRAPH_REVIEW_FAILED');
 return {reviewedOriginals:reviewed.length,archivedAttachments:reviewed.length,connections:result.data};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const config=readWorkerConfig(process.env);const c=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(45000)})}});console.log(JSON.stringify(await reviewBatch5(c,drsClient(process.env.FAA_DRS_API_KEY))));}
 catch(e){console.error(JSON.stringify({status:'failed',code:e instanceof ImportError?e.code:'SOURCE_REVIEW_FAILED'}));process.exitCode=1;}
}
