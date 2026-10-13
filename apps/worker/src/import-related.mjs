import { createClient } from '@supabase/supabase-js';
import { readWorkerConfig } from './check.mjs';
import { drsClient, ImportError } from './drs.mjs';
import { importRelated } from './related.mjs';
try {
  const verifyOnly=process.argv.includes('--verify-only');
  const requested=process.argv.find(a=>a.startsWith('--type='))?.slice(7);
  if(requested&&!['AD','STC','CAR'].includes(requested))throw new ImportError('UNSUPPORTED_DOCUMENT_TYPE');
  const config=verifyOnly?null:readWorkerConfig(process.env);
  const client=config?createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(45000)})}}):null;
  const source=drsClient(process.env.FAA_DRS_API_KEY);
  for(const type of requested?[requested]:['AD','STC','CAR'])console.log(JSON.stringify(await importRelated(client,source,type,{verifyOnly})));
} catch(error) {console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'RELATED_IMPORT_FAILED'}));process.exitCode=1;}
