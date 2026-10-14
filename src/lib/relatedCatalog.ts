import {createClient} from '@supabase/supabase-js';
import {readPublicConfig} from './publicConfig';
import type {Database} from './database.types';
import type {RelatedDocument} from '../domain/explorer';
const config=readPublicConfig(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const client=()=>config?createClient<Database>(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}}):null;
export async function loadRelated(model:string) {
  const c=client();if(!c)return {documents:[],checked:[],notice:'Connect the shared catalog to browse related FAA records.'};
  try {
    const documents:RelatedDocument[]=[];const seen=new Set<string>();let expected:number|null=null;
    for(let offset=0;offset<10000;offset+=200){
      const result=await c.from('related_documents').select('id,model,document_type,document_number,title,status,is_active,source_url,retrieved_at,effective_date,holder,summary,candidate_reason,supersedes,superseded_by,original_archived,attachments_pending',{count:'exact'}).eq('model',model).order('document_type').order('document_number').order('id').range(offset,offset+199);
      if(result.error||result.count===null||(expected!==null&&expected!==result.count))throw new Error('Incomplete index');expected=result.count;
      for(const row of result.data??[]){if(seen.has(row.id))throw new Error('Changed index');seen.add(row.id);documents.push(row);}
      if(documents.length===expected)break;
      if(!result.data?.length||offset>=9800)throw new Error('Incomplete index');
    }
    if(documents.length!==expected)throw new Error('Incomplete index');
    const checked=await c.rpc('related_last_checked',{p_model:model});
    return {documents,checked:checked.data??[],notice:checked.error?'Source check dates are unavailable.':undefined};
  }catch{return {documents:[],checked:[],notice:'Related FAA records are temporarily unavailable. Reload to try again.'};}
}
export async function loadRelatedText(id:string,model:string) {
  const c=client();if(!c)return null;
  try {const r=await c.from('related_documents').select('regulatory_text').eq('id',id).eq('model',model).maybeSingle();return r.error?null:r.data?.regulatory_text??null;}catch{return null;}
}
export type ReviewQueueRow={version_id:string;model:string;document_type:string;document_number:string;title:string;source_url:string;retrieved_at:string;original_archived:boolean;attachments_pending:boolean;review_status:string;review_reason:string;priority:number};
export async function loadReviewQueue(model:string) {
  const c=client();if(!c)return {rows:[] as ReviewQueueRow[],notice:'Connect the shared catalog to browse review coverage.'};
  try {
    const rows:ReviewQueueRow[]=[];let expected:number|null=null;const seen=new Set<string>();
    for(let offset=0;offset<10000;offset+=200){
      const r=await c.from('source_review_queue').select('*',{count:'exact'}).eq('model',model).order('priority').order('document_type').order('document_number').order('version_id').range(offset,offset+199);
      if(r.error||r.count===null||(expected!==null&&expected!==r.count))throw new Error('Changed queue');expected=r.count;
      for(const row of r.data??[]){if(seen.has(row.version_id))throw new Error('Changed queue');seen.add(row.version_id);rows.push(row);}
      if(rows.length===expected)return {rows};if(!r.data?.length)break;
    }
    throw new Error('Incomplete queue');
  }catch{return {rows:[] as ReviewQueueRow[],notice:'Review coverage is temporarily unavailable. Reload to try again.'};}
}
export async function getOriginalLink(versionId:string,attachmentId?:string) {
  if(!config)throw new Error('Source viewer unavailable');
  const r=await fetch(config.url+'/functions/v1/source-viewer',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({versionId,attachmentId}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('Source viewer unavailable');
  const result:unknown=await r.json();
  if(!result||typeof result!=='object'||!('url' in result)||typeof result.url!=='string'||new URL(result.url).origin!==new URL(config.url).origin)throw new Error('Invalid source link');
  return result.url;
}
