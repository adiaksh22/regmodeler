import {createClient} from '@supabase/supabase-js';
import {readWorkerConfig} from './check.mjs';
import {drsClient,ImportError} from './drs.mjs';
import {checkTcdsFamily} from './import-tcds-family.mjs';
try{
  const certificate=(process.argv.find(argument=>argument.startsWith('--certificate='))?.split('=')[1]??'').toUpperCase();
  const config=readWorkerConfig(process.env);
  const client=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(45000)})}});
  console.log(JSON.stringify(await checkTcdsFamily(client,drsClient(process.env.FAA_DRS_API_KEY),certificate)));
}catch(error){console.error(JSON.stringify({status:'failed',code:error instanceof ImportError?error.code:'TCDS_CHECK_FAILED'}));process.exitCode=1;}
