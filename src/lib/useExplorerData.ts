import {useCallback,useEffect,useState} from 'react';
import type {CatalogDocument} from '../domain/catalog';
import type {ExplorerDetails,ExplorerSection} from '../domain/explorer';
import {explorerConfigured,invalidateExplorerSection,loadMonitoring,loadScopedGraph,loadVariantSummaries} from './explorerReads';
import {GraphReadError} from './boundedGraph';

function useSection<T>(key:string,load:()=>Promise<T>,enabled:boolean,reload:number){
 const [attempt,setAttempt]=useState(0);
 const requestKey=JSON.stringify([key,reload,attempt]);
 const [result,setResult]=useState<{key:string;requestKey:string;data?:T;error?:string;loadedAt?:string}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;
  void load().then(data=>{if(active)setResult({key,requestKey,data,loadedAt:new Date().toISOString()});}).catch(error=>{
   if(active)setResult(previous=>({key,requestKey,data:previous?.key===key?previous.data:undefined,loadedAt:previous?.key===key?previous.loadedAt:undefined,error:error instanceof GraphReadError?(error.code==='TOO_LARGE'?'This view has too many connections. Choose a single model or turn off the family network.':'The response was incomplete or changed while loading. Try again.'):'Source data could not be loaded. Try again.'}));
  });
  return()=>{active=false;};
 },[key,requestKey,load,enabled]);
 const current=result?.key===key?result:null;
 const state:ExplorerSection={status:!enabled?'idle':current?.requestKey!==requestKey?'loading':current.error?'error':'ready',loadedAt:current?.loadedAt,error:current?.requestKey===requestKey?current.error:undefined};
 return {data:current?.data,state,retry:()=>setAttempt(value=>value+1)};
}

export function useExplorerData(doc:CatalogDocument,model:string,family:boolean,enabled:boolean,reload=0){
 const certificate=doc.tcds_number;
 const revisionKey=JSON.stringify([doc.revision,doc.url,doc.retrieved_at]);
 const graphKey=JSON.stringify([certificate,revisionKey,family?null:model]);
 const readGraph=useCallback(()=>loadScopedGraph(certificate,revisionKey,family?null:model),[certificate,revisionKey,family,model]);
 const readVariants=useCallback(()=>loadVariantSummaries(certificate,revisionKey),[certificate,revisionKey]);
 const graph=useSection(graphKey,readGraph,enabled&&explorerConfigured,reload);
 const variants=useSection(JSON.stringify([certificate,revisionKey]),readVariants,enabled&&explorerConfigured,reload);
 const monitoring=useSection('monitoring',loadMonitoring,enabled&&explorerConfigured,reload);
 const checks=monitoring.data??[];
 const details:ExplorerDetails={revisions:[],relationships:graph.data??[],available:graph.data!==undefined,lastChecked:checks.find(row=>row.source==='FAA:TCDSMODEL:'+certificate.toUpperCase())?.last_success??null,variants:variants.data??[],monitoring:monitoring.data,sections:{relationships:graph.state,variants:variants.state,monitoring:monitoring.state},notice:enabled&&!explorerConfigured?'Connect the shared catalog to load reviewed aircraft data.':undefined};
 return {details,retry:(section:'relationships'|'variants'|'monitoring')=>{
  // Failed cache entries are already evicted. Explicit retries also refresh
  // any successful data retained while showing the error.
  invalidateExplorerSection(certificate,section);
  ({relationships:graph,variants,monitoring})[section].retry();
 }};
}
