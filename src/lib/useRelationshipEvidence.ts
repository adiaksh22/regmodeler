import {useEffect,useState} from 'react';
import {loadRelationshipEvidence} from './catalog';
import type {ApplicabilityRule,RegulationSource} from '../domain/explorer';

type Details={key:string;status:'ready'|'error';rules:ApplicabilityRule[];materials:RegulationSource[]};
export function useRelationshipEvidence(context:string,relationshipId:string|null,basisKey?:string) {
 const [result,setResult]=useState<Details|null>(null);
 const [attempt,setAttempt]=useState(0);
 const key=JSON.stringify([context,relationshipId,basisKey,attempt]);
 useEffect(()=>{
  if(!relationshipId)return;
  let active=true;
  void loadRelationshipEvidence(relationshipId,basisKey).then(data=>{
   if(active)setResult({key,status:'ready',...data});
  }).catch(()=>{if(active)setResult({key,status:'error',rules:[],materials:[]});});
  return()=>{active=false;};
 },[key,relationshipId,basisKey]);
 const current=relationshipId&&result?.key===key?result:null;
 return {status:!relationshipId?'idle':current?.status??'loading',rules:current?.rules??[],materials:current?.materials??[],retry:()=>setAttempt(value=>value+1)};
}
