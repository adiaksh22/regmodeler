import {publicCatalogClient as client} from './publicClient';
export type SourceQualityFinding={kind:'incomplete_original'|'identity_mismatch';summary:string;reviewed_record_number:string|null;reviewed_record_url:string|null;reviewed_version_id:string|null;reviewed_at:string};
export async function loadSourceQuality(versionId:string,model:string):Promise<{findings:SourceQualityFinding[];notice?:string}>{
 if(!client)return {findings:[]};
 try{
  const result=await client.rpc('source_quality_details',{p_version:versionId,p_model:model});if(result.error)throw new Error('Unavailable');
  return {findings:result.data??[]};
 }catch{return {findings:[],notice:'Source-quality notes are temporarily unavailable.'};}
}
export function officialReviewedRecord(url:string|null){
 if(!url)return null;
 try{const target=new URL(url);return target.protocol==='https:'&&target.hostname==='drs.faa.gov'&&!target.username&&!target.password&&!target.port&&!target.search&&!target.hash&&/^\/browse\/excelExternalWindow\/[A-Za-z0-9._-]+$/.test(target.pathname)?target.href:null;}catch{return null;}
}
