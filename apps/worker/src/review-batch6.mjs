import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError} from './drs.mjs';
import {collectRelated} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
import {legacyPublishedOriginal,publishedOriginal} from './published-original.mjs';
const reviewed=JSON.parse(readFileSync(new URL('./review-batch6.json',import.meta.url)));
export async function reviewBatch6(client,source){
 const records=await collectRelated(source,'AD');
 for(const entry of reviewed){
  const record=records.find(r=>r['drs:documentNumber']===entry.number&&r['drs:status']==='Current');if(!record)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
  if(record.hasMoreAttachments)throw new ImportError('ATTACHMENT_INVENTORY_CHANGED');
  const bytes=entry.legacy_publication?await legacyPublishedOriginal(record,entry.published_url,entry.number):await publishedOriginal(record,entry.published_url);
  await archiveReviewedSource(client,'AD',record,bytes,entry.hash,{original_source_url:entry.published_url,original_source_kind:'final_federal_register',original_publication_date:record['drs:adfrawdCitationPublishDate']});
 }
 const result=await client.rpc('review_pa28_batch6_graph');if(result.error)throw new ImportError('BATCH6_GRAPH_REVIEW_FAILED');
 return {reviewedOriginals:reviewed.length,verifiedPublications:reviewed.length,archivedAttachments:0,connections:result.data};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const config=readWorkerConfig(process.env);const c=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(45000)})}});console.log(JSON.stringify(await reviewBatch6(c,drsClient(process.env.FAA_DRS_API_KEY))));}
 catch(e){console.error(JSON.stringify({status:'failed',code:e instanceof ImportError?e.code:'SOURCE_REVIEW_FAILED'}));process.exitCode=1;}
}
