import {qualityStates,reviewState,reviewStates} from '../domain/sourceStatus';
export default function SourceStatus({status,flags=[],explain=false}:{status?:string;flags?:string[];explain?:boolean}){
 const state=reviewState(status);
 return <span className="block mt-2 text-xs" aria-label="Evidence review status">
  <span className={`inline-block rounded border px-2 py-1 font-semibold ${state.attention?'border-amber-300 bg-amber-50 text-amber-950':status==='reviewed'?'border-blue-200 bg-blue-50 text-blue-900':'border-slate-300 bg-slate-50 text-slate-700'}`}>{state.label}</span>
  {explain&&<span className="block mt-2 leading-relaxed text-slate-700">{state.explanation}</span>}
  {[...new Set(flags)].filter(flag=>qualityStates[flag]).map(flag=><span key={flag} className="block mt-2 text-amber-950">
   <span className="inline-block rounded border border-amber-300 bg-amber-50 px-2 py-1 font-semibold">{qualityStates[flag].label}</span>
   {explain&&<span className="block mt-1 leading-relaxed">{qualityStates[flag].explanation}</span>}
  </span>)}
 </span>;
}
export function SourceStatusGuide(){
 return <details className="mb-4 rounded-lg border border-slate-200 p-3 text-sm">
  <summary className="cursor-pointer font-semibold">What do the source labels mean?</summary>
  <dl className="mt-3 space-y-3">{[...Object.values(reviewStates).slice(0,4),...Object.values(qualityStates)].map(state=><div key={state.label}><dt className="font-semibold">{state.label}</dt><dd className="mt-1 text-slate-600">{state.explanation}</dd></div>)}</dl>
  <p className="mt-3 text-slate-600">FAA current status describes the FAA record. A saved primary PDF describes retrieval. Neither establishes complete evidence, installation approval, or aircraft compliance. Additional files may still be needed.</p>
 </details>;
}
