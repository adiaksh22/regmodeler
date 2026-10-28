import {createClient} from '@supabase/supabase-js';
import {readWorkerConfig} from '../apps/worker/src/check.mjs';
// Operator-only: no privileged keys or review mutations enter the browser.
const [version,model,decision,...note]=process.argv.slice(2);
try {
 if(!/^[a-f0-9-]{36}$/i.test(version??'')||!/^[-A-Z0-9]{1,160}$/.test(model??'')||!['pending','deferred','rejected'].includes(decision))throw new Error();
 const config=readWorkerConfig(process.env);const client=createClient(config.url,config.secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(15000)})}});
 const r=await client.rpc('set_source_review_decision',{p_version:version,p_model:model,p_decision:decision,p_note:note.join(' ')});if(r.error)throw new Error();console.log('Review decision saved.');
}catch{console.error('Decision not saved. Use a current unreviewed version UUID, supported model, pending/deferred/rejected, and optional private note.');process.exitCode=1;}
