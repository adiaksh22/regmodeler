import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {review,reviewRevision82} from './review-boeing-revision82.mjs';
import {drsClient,ImportError,sha256} from './drs.mjs';
import {readWorkerConfig} from './check.mjs';
export async function reviewFamilyIndex(client,source,{verifyOnly=false}={}){
 await reviewRevision82(client,source,{verifyOnly:true});
 if(verifyOnly)return {certificate:review.certificate,models:review.models.length,page:1,hash:review.hash};
 const original=await client.from('document_versions').select('storage_path').eq('source_url',review.source_url).eq('content_sha256',review.hash).eq('status','current').single();
 if(original.error||original.data.storage_path!==`FAA/TCDS/A16WE/${review.hash}.pdf`)throw new ImportError('REVIEWED_ARCHIVE_UNAVAILABLE');
 const archived=await client.storage.from('regulatory-sources').download(original.data.storage_path);
 if(archived.error||sha256(Buffer.from(await archived.data.arrayBuffer()))!==review.hash)throw new ImportError('REVIEWED_ARCHIVE_MISMATCH');
 const committed=await client.rpc('review_boeing_family_index');if(committed.error||committed.data!==34)throw new ImportError('REVIEW_COMMIT_FAILED');
 return {certificate:review.certificate,models:17,identityConnections:committed.data,page:1};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const verifyOnly=process.argv.includes('--verify-only');const config=verifyOnly?null:readWorkerConfig(process.env);
  const client=config?createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false}}):null;
  console.log(JSON.stringify(await reviewFamilyIndex(client,drsClient(process.env.FAA_DRS_API_KEY),{verifyOnly})));
 }catch(error){console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'REVIEW_FAILED'}));process.exitCode=1;}
}
