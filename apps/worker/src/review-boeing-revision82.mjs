import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {readWorkerConfig} from './check.mjs';
export const review=JSON.parse(readFileSync(new URL('./boeing-revision82.json',import.meta.url)));
export function validateRevision82(record,bytes){
 if(record.documentURL!==review.source_url||record['drs:documentNumber']!==review.certificate||record['drs:status']!=='Current'||String(record['drs:tcdsmodelRevisionNumber'])!==review.revision||record['drs:tcdsmodelRevisionDate']!==review.date||!Array.isArray(record['drs:tcdsmodelModel'])||JSON.stringify([...record['drs:tcdsmodelModel']].sort())!==JSON.stringify(review.models))throw new ImportError('REVIEWED_RECORD_MISMATCH');
 if(bytes.subarray(0,5).toString()!=='%PDF-'||sha256(bytes)!==review.hash)throw new ImportError('REVIEWED_SOURCE_MISMATCH');
}
export async function reviewRevision82(client,source,{verifyOnly=false}={}){
 const result=await source.tcdsPage(review.certificate);
 if(!result.summary||result.summary.hasMoreItems||result.documents?.length!==result.summary.totalItems||result.documents.length>100)throw new ImportError('INCOMPLETE_TARGETED_SOURCE');
 const current=result.documents.filter(row=>row['drs:status']==='Current');if(current.length!==1)throw new ImportError('REVIEWED_RECORD_UNAVAILABLE');
 const bytes=await source.pdf(current[0].mainDocumentDownloadURL);validateRevision82(current[0],bytes);
 if(verifyOnly)return {certificate:review.certificate,revision:review.revision,variants:review.variants.length,hash:review.hash};
 const original=await client.from('document_versions').select('id,storage_path').eq('source_url',review.source_url).eq('content_sha256',review.hash).eq('status','current').single();
 if(original.error||original.data.storage_path!==`FAA/TCDS/A16WE/${review.hash}.pdf`)throw new ImportError('REVIEWED_ARCHIVE_UNAVAILABLE');
 const archived=await client.storage.from('regulatory-sources').download(original.data.storage_path);
 if(archived.error||sha256(Buffer.from(await archived.data.arrayBuffer()))!==review.hash)throw new ImportError('REVIEWED_ARCHIVE_MISMATCH');
 const committed=await client.rpc('review_boeing_revision82');if(committed.error)throw new ImportError('REVIEW_COMMIT_FAILED');
 return {certificate:review.certificate,revision:review.revision,variants:review.variants.length,connections:committed.data};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const verifyOnly=process.argv.includes('--verify-only');const config=verifyOnly?null:readWorkerConfig(process.env);
  const client=config?createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false}}):null;
  console.log(JSON.stringify(await reviewRevision82(client,drsClient(process.env.FAA_DRS_API_KEY),{verifyOnly})));
 }catch(error){console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'REVIEW_FAILED'}));process.exitCode=1;}
}
