import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {matchingModels} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
export const review=JSON.parse(readFileSync(new URL('./boeing-ad-review.json',import.meta.url)));

export function validateBoeingReview(record,bytes) {
  if(record['drs:documentNumber']!==review.number||record.documentURL!==review.source_url||record['drs:status']!=='Current'||record['drs:adfrawdCitationPublishDate']!==review.publication_date||review.models.some(model=>!matchingModels('AD',record,'B737').includes(model)))throw new ImportError('REVIEWED_RECORD_MISMATCH');
  if(bytes.subarray(0,5).toString()!=='%PDF-'||sha256(bytes)!==review.hash)throw new ImportError('REVIEWED_SOURCE_MISMATCH');
}

export async function reviewBoeingAd(client,source,{request=fetch,verifyOnly=false}={}) {
  // A named AD filter avoids rescanning a family catalog during source review.
  const result=await source.metadata('ADFRAWD',{'drs:documentNumber':[review.number]});
  if(!result.summary||result.summary.hasMoreItems||result.summary.totalItems!==result.documents?.length)throw new ImportError('INCOMPLETE_TARGETED_SOURCE');
  const records=result.documents.filter(record=>record['drs:documentNumber']===review.number&&record['drs:status']==='Current');
  if(records.length!==1)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
  const response=await request(review.published_url,{redirect:'error',signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new ImportError('PUBLICATION_UNAVAILABLE');
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>5_000_000)throw new ImportError('SOURCE_FILE_TOO_LARGE');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);validateBoeingReview(records[0],bytes);
  if(verifyOnly)return {mode:'verified',number:review.number,models:review.models,sourcePage:review.page};
  await archiveReviewedSource(client,'AD',records[0],bytes,review.hash,{original_source_url:review.published_url,original_source_kind:'final_federal_register',original_publication_date:review.publication_date},'B737');
  const committed=await client.rpc('review_boeing_ad_graph');if(committed.error)throw new ImportError('BOEING_GRAPH_REVIEW_FAILED');
  return {mode:'reviewed',number:review.number,models:review.models,physicalRelationships:committed.data,attachments:'Not reviewed; retained as pending'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{const verifyOnly=process.argv.includes('--verify-only');const config=verifyOnly?null:readWorkerConfig(process.env);const client=config?createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(45000)})}}):null;console.log(JSON.stringify(await reviewBoeingAd(client,drsClient(process.env.FAA_DRS_API_KEY),{verifyOnly})));}
  catch(error){console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'BOEING_REVIEW_FAILED'}));process.exitCode=1;}
}
