import type {SourceMonitoring} from './sourceChanges';
export const monitoredSources=[
 {source:'FAA:TCDSMODEL:2A13',label:'Piper PA-28 · TCDS 2A13',type:'TCDS',certificate:'2A13',models:['PA-28-140','PA-28-181']},
 {source:'FAA:TCDSMODEL:A16WE',label:'Boeing 737 · TCDS A16WE',type:'TCDS',certificate:'A16WE',models:['737-700','737-800','737-900ER','737-7','737-8','737-9']},
 {source:'FAA:ADFRAWD:PA28',label:'Piper PA-28 · AD index',type:'AD',certificate:'2A13',models:['PA-28-140','PA-28-181']},
 {source:'FAA:STC:PA28',label:'Piper PA-28 · STC index',type:'STC',certificate:'2A13',models:['PA-28-140','PA-28-181']},
 {source:'FAA:ADFRAWD:B737',label:'Boeing 737 · AD index',type:'AD',certificate:'A16WE',models:['737-700','737-800','737-900ER','737-7','737-8','737-9']},
 {source:'FAA:STC:B737',label:'Boeing 737 · STC index',type:'STC',certificate:'A16WE',models:['737-700','737-800','737-900ER','737-7','737-8','737-9']},
];
export const monitoredModels=[...new Set(monitoredSources.flatMap(source=>source.models))];
export function evidencePath(model:string,type:string,number:string){
 const certificate=type==='TCDS'?number:monitoredSources.find(source=>source.models.includes(model))?.certificate;
 return certificate?`/tcds/${encodeURIComponent(certificate)}?model=${encodeURIComponent(model)}`:null;
}
export function sourceHealth(check:SourceMonitoring,now=Date.now()):{label:string;attention:boolean;explanation:string}{
 if(check.status==='failed')return {label:'Latest check failed',attention:true,explanation:'The last successful data remains available. Changes since that check may be missing.'};
 if(check.status==='running')return now-Date.parse(check.last_attempt??'')>60*60*1000
  ?{label:'Check may be interrupted',attention:true,explanation:'The attempt has been running for more than one hour. Its result is not confirmed.'}
  :{label:'Check in progress',attention:false,explanation:'A successful result has not yet been recorded for this attempt.'};
 const success=Date.parse(check.last_success??'');
 if(!Number.isFinite(success)||success>now+5*60*1000)return {label:'Freshness unconfirmed',attention:true,explanation:'No valid successful check time is available.'};
 if(now-success>36*60*60*1000)return {label:'Check overdue',attention:true,explanation:'No successful check in the past 36 hours. Daily scheduled checks can be delayed.'};
 if(!check.baseline_ready)return {label:'Baseline pending',attention:true,explanation:'A successful check exists, but change-event coverage has not established a baseline.'};
 return {label:'Recently checked',attention:false,explanation:'A successful source check was recorded within 36 hours. This is not an aircraft compliance determination.'};
}
