import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { handleSourceRequest,cors } from './handler.mjs';
Deno.serve(async(request:Request)=>{
  try {
    const url=Deno.env.get('SUPABASE_URL')!;
    const modern=Deno.env.get('SUPABASE_SECRET_KEYS');
    const secret=(modern?JSON.parse(modern).default:null)??Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!secret)throw new Error('Configuration unavailable');
    const client=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
    return await handleSourceRequest(request,client,new URL(url).origin);
  } catch {return Response.json({error:'SOURCE_UNAVAILABLE'},{status:503,headers:cors});}
});
