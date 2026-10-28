import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {matchingModels} from './related.mjs';
import {legacyPublishedOriginal} from './published-original.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
export const ngReview=JSON.parse(readFileSync(new URL('./boeing-ng-review.json',import.meta.url)));
export function validateNgRecord(entry,record){
 if(record['drs:documentNumber']!==entry.number||record['drs:status']!=='Current'||record.documentURL!==entry.source_url||record.hasMoreAttachments||entry.models.some(model=>!matchingModels(entry.type,record,'B737').includes(model))||(entry.publication_date&&record['drs:adfrawdCitationPublishDate']!==entry.publication_date))throw new ImportError('NG_REVIEW_SCOPE_MISMATCH');
}
export async function reviewBoeingNg(client,source,{verifyOnly=false,request=fetch}={}){
 for(const entry of ngReview){
  const response=await source.metadata(entry.type==='AD'?'ADFRAWD':'STC',{'drs:documentNumber':[entry.number]});
  if(!response.summary||response.summary.hasMoreItems||response.summary.count!==response.documents?.length||response.summary.totalItems!==response.documents?.length)throw new ImportError('INCOMPLETE_TARGETED_SOURCE');
  const records=response.documents.filter(row=>row['drs:documentNumber']===entry.number&&row['drs:status']==='Current');if(records.length!==1)throw new ImportError('NG_REVIEW_SOURCE_UNAVAILABLE');
  const record=records[0];validateNgRecord(entry,record);
  const bytes=entry.published_url?await legacyPublishedOriginal(record,entry.published_url,entry.number,{request}):await source.pdf(record.mainDocumentDownloadURL);
  if(sha256(bytes)!==entry.hash)throw new ImportError('REVIEWED_SOURCE_MISMATCH');
  if(!verifyOnly)await archiveReviewedSource(client,entry.type,record,bytes,entry.hash,entry.published_url?{original_source_url:entry.published_url,original_source_kind:'final_federal_register',original_publication_date:entry.publication_date}:{original_page_count:1,original_printed_page_count:2,original_completeness:'Only page 1 of the stated 2-page certificate was delivered; complete terms remain unverified.'},'B737');
 }
 if(verifyOnly)return {mode:'verified',sources:ngReview.map(entry=>entry.number)};
 const result=await client.rpc('review_boeing_ng_graph');if(result.error)throw new ImportError('NG_GRAPH_REVIEW_FAILED');
 return {mode:'reviewed',sources:ngReview.map(entry=>entry.number),physicalRelationships:result.data};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const verifyOnly=process.argv.includes('--verify-only');const config=verifyOnly?null:readWorkerConfig(process.env);const client=config?createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(45000)})}}):null;console.log(JSON.stringify(await reviewBoeingNg(client,drsClient(process.env.FAA_DRS_API_KEY),{verifyOnly})));}
 catch(error){console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'NG_REVIEW_FAILED'}));process.exitCode=1;}
}
