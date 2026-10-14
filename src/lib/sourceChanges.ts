import {createClient} from '@supabase/supabase-js';
import {readPublicConfig} from './publicConfig';
import type {Database} from './database.types';
const config=readPublicConfig(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export async function loadSourceChanges(model:string,type:string,offset=0){
  if(!config)return {events:[],monitoring:[],total:0,notice:'Connect the shared catalog to read source checks and change events.'};
  try{
    const client=createClient<Database>(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(i,n)=>fetch(i,{...n,signal:AbortSignal.timeout(15000)})}});
    let query=client.from('source_change_feed').select('*',{count:'exact'}).order('detected_at',{ascending:false}).order('id').range(offset,offset+19);
    if(model)query=query.contains('models',[model]);if(type)query=query.eq('document_type',type);
    const [events,checks]=await Promise.all([query,client.rpc('source_monitoring')]);
    if(events.error||checks.error)throw new Error();
    return {events:events.data??[],monitoring:checks.data??[],total:events.count??0,notice:''};
  }catch{return {events:[],monitoring:[],total:0,notice:'Source changes are temporarily unavailable. This does not mean no changes occurred.'};}
}
