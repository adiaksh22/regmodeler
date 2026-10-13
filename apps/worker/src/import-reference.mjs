import {createClient} from '@supabase/supabase-js';
import {readWorkerConfig} from './check.mjs';
import {ImportError} from './drs.mjs';
import {importReference} from './reference-text.mjs';
try {
  const config=readWorkerConfig(process.env);
  const client=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(45000)})}});
  console.log(JSON.stringify(await importReference(client)));
}catch(e){console.error(JSON.stringify({status:'failed',code:e instanceof ImportError?e.code:'REFERENCE_IMPORT_FAILED'}));process.exitCode=1;}
