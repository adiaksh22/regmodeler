import {publicCatalogClient as client} from './publicClient';
import {createReadCache} from './readCache';
import {readBoundedGraph} from './boundedGraph';
const cache=createReadCache();
export const explorerConfigured=!!client;
const prefix=(number:string)=>`certificate:${number.toUpperCase()}:`;
export function invalidateExplorerReads(number:string){cache.invalidate(prefix(number));cache.invalidate('monitoring:');}
export function invalidateExplorerSection(number:string,section:'relationships'|'variants'|'monitoring'){
 if(section==='monitoring')cache.invalidate('monitoring:');
 else cache.invalidate(prefix(number)+JSON.stringify([section==='relationships'?'graph':'variants']).slice(0,-1));
}
export function loadScopedGraph(number:string,revisionKey:string,model:string|null){
 return cache.read(prefix(number)+JSON.stringify(['graph',revisionKey,model]),async()=>{
  const c=client;if(!c)throw Error('Shared catalog not configured');
  return readBoundedGraph(async(offset,size)=>{
   let query=c.from('model_graph').select('*',{count:'exact'}).eq('tcds_number',number.toUpperCase());
   if(model)query=query.eq('model',model);
   const result=await query.order('model').order('id').order('path_via',{nullsFirst:true}).range(offset,offset+size-1);
   if(result.error)throw Error('Reviewed relationships unavailable');
   return {rows:result.data??[],total:result.count};
  },model?1000:2000);
 });
}
export function loadVariantSummaries(number:string,revisionKey:string){
 return cache.read(prefix(number)+JSON.stringify(['variants',revisionKey]),async()=>{
  if(!client)throw Error('Shared catalog not configured');
  const result=await client.from('aircraft_variant_catalog').select('*',{count:'exact'}).eq('tcds_number',number.toUpperCase()).order('entity_id').range(0,199);
  if(result.error||result.count===null||result.count>200||result.data?.length!==result.count)throw Error('Technical profiles unavailable');
  return result.data??[];
 });
}
export function loadMonitoring(){
 return cache.read('monitoring:coverage',async()=>{
  if(!client)throw Error('Shared catalog not configured');
  const result=await client.rpc('source_monitoring_coverage');
  if(result.error)throw Error('Source check health unavailable');
  return result.data??[];
 });
}
