import type {SourceMonitoring as Check} from '../domain/sourceChanges';
import {monitoredSources,sourceHealth} from '../domain/sourceHealth';
export default function SourceMonitoring({checks,model='',type='',certificate=''}:{checks:Check[];model?:string;type?:string;certificate?:string}){
 const sources=monitoredSources.filter(source=>(!model||source.models.includes(model))&&(!type||source.type===type)&&(!certificate||source.certificate===certificate));
 return <section aria-label="Source check health" className="my-4"><h2 className="font-semibold text-sm">Source check health</h2>
  <p className="text-xs text-slate-600 mt-1 mb-3">Daily metadata checks and weekly scoped reconciliation are scheduled. TCDS PDF bytes are verified during reconciliation; unchanged daily metadata checks do not re-download PDFs. AD/STC PDF and attachment changes are not automatically monitored.</p>
  <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{sources.map(source=>{
   const check=checks.find(check=>check.source===source.source);
   const state=sourceHealth(check??{source:source.source,last_success:null,last_attempt:null,status:null,baseline_ready:false});
   return <li key={source.source} className={`rounded-lg border p-3 text-xs ${state.attention?'border-amber-300 bg-amber-50 text-amber-950':'border-slate-200 bg-slate-50 text-slate-700'}`}>
    <p className="font-semibold">{source.label}</p><p className="font-semibold mt-2">{state.label}</p><p className="mt-1">{state.explanation}</p>
    <p className="mt-2">Last success: {check?.last_success?new Date(check.last_success).toLocaleString():'Not recorded'}</p>
    <p className="mt-1">Latest attempt: {check?.last_attempt?new Date(check.last_attempt).toLocaleString():'Not recorded'}</p>
    <p className="mt-1">{check?.baseline_ready?'Change baseline established':'Change baseline not established'}</p>
   </li>;
  })}</ul>
 </section>;
}
