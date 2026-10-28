import {createClient} from '@supabase/supabase-js';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {matchingModels} from './related.mjs';
import {archiveReviewedSource} from './reviewed-sources.mjs';
export const stcResolution=JSON.parse(readFileSync(new URL('./boeing-stc-resolution.json',import.meta.url)));
export const issueSources=[
 {number:'SA04009NY',source_url:'https://drs.faa.gov/browse/excelExternalWindow/07A530DDF760EA80862583010051E9C2.0001',hash:'2c3ad86cdcb0cca39713943b475003e6c5c793bfa794ca22d92c38065cf1cc1f',models:['737-700','737-800'],material:{original_identity_review:'PDF identifies ST04009NY but the FAA index identifies SA04009NY. No graph approval is inferred.'}},
 {number:'SA01635LA',source_url:'https://drs.faa.gov/browse/excelExternalWindow/B4937613F858F5748625721F0058F42D.0001',hash:'3877ca36480b7d4b33b6d868f243e0c112dcb503f2298fc0a65714b2dd7a5a6c',models:['737-700','737-800'],material:{original_page_count:1,original_printed_page_count:2,original_completeness:'Page 2 remains unobtained. ST01635LA is a separate reviewed record, not an inferred replacement.'}},
];
export function validateResolutionSource(entry,record,bytes){
 if(record['drs:documentNumber']!==entry.number||record.documentURL!==entry.source_url||record['drs:status']!=='Current'||record.hasMoreAttachments||entry.models.some(model=>!matchingModels('STC',record,'B737').includes(model)))throw new ImportError('STC_RESOLUTION_SCOPE_MISMATCH');
 if(bytes.subarray(0,5).toString()!=='%PDF-'||sha256(bytes)!==entry.hash)throw new ImportError('STC_RESOLUTION_ORIGINAL_MISMATCH');
}
export async function reviewStcResolution(client,source,{verifyOnly=false}={}){
 for(const entry of [...stcResolution,...issueSources]){
  const response=await source.metadata('STC',{'drs:documentNumber':[entry.number]});
  if(!response.summary||response.summary.hasMoreItems||response.summary.totalItems!==response.documents?.length||response.summary.count!==response.documents?.length||response.documents.length>10)throw new ImportError('INCOMPLETE_TARGETED_SOURCE');
  const current=response.documents.filter(row=>row['drs:documentNumber']===entry.number&&row['drs:status']==='Current');if(current.length!==1)throw new ImportError('STC_CURRENT_AMBIGUOUS');
  // Download only the current original, even when the named response includes history.
  const bytes=await source.pdf(current[0].mainDocumentDownloadURL);validateResolutionSource(entry,current[0],bytes);
  if(!verifyOnly)await archiveReviewedSource(client,'STC',current[0],bytes,entry.hash,entry.material??{original_page_count:3,original_printed_page_count:3,original_completeness:'All three certificate pages reviewed; supporting documents remain unobtained.'},'B737');
 }
 if(verifyOnly)return {mode:'verified',targetedRecords:4,reviewedStcs:stcResolution.map(entry=>entry.number)};
 const result=await client.rpc('review_boeing_stc_resolution');if(result.error)throw new ImportError('STC_RESOLUTION_COMMIT_FAILED');
 return {mode:'reviewed',targetedRecords:4,physicalRelationships:result.data,reviewedStcs:stcResolution.map(entry=>entry.number),originalSaFindings:'Preserved; no renumbering inferred'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const verifyOnly=process.argv.includes('--verify-only');const config=verifyOnly?null:readWorkerConfig(process.env);const client=config?createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(45000)})}}):null;console.log(JSON.stringify(await reviewStcResolution(client,drsClient(process.env.FAA_DRS_API_KEY),{verifyOnly})));}
 catch(error){console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'STC_RESOLUTION_FAILED'}));process.exitCode=1;}
}
