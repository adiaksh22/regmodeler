import type {AircraftVariantSummary,VariantFact} from '../domain/explorer';
import {aircraftModelIdentity} from '../domain/aircraftModelIdentity';

const value=(fact:VariantFact|undefined)=>fact ? `${Number(fact.numeric_value).toLocaleString()}${fact.unit==='lb'?' lb':fact.unit==='ft'?' ft':fact.unit==='seats'?' seats':fact.unit==='people'?'':fact.unit?` ${fact.unit}`:''}` : 'Not reviewed';

export default function AircraftFamilySummary({variants,selected,onSelect}:{variants:AircraftVariantSummary[];selected:string;onSelect:(model:string)=>void}){
 if(!variants.length)return null;
 const approved=variants.filter(v=>v.faa_status==='faa_approved').map(v=>({...v,model_key:aircraftModelIdentity(v.tcds_number,v.model_key)}));
 const pending=variants.filter(v=>v.faa_status!=='faa_approved');
 const active=approved.find(v=>v.model_key===selected)??approved[0];
 const facts=active?.facts??{};
 return <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4" aria-labelledby="family-overview-title">
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">FAA family record</p><h2 id="family-overview-title" className="text-xl font-bold text-slate-950">Boeing 737 variants in A16WE</h2><p className="text-sm text-slate-600">Approval status and limits come from current FAA TCDS Revision 81.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">{approved.length} reviewed FAA-approved models</span></div>
  <div className="flex flex-wrap gap-2 pb-2" aria-label="Reviewed Boeing 737 variants">{approved.map(v=><button key={v.entity_id} onClick={()=>onSelect(v.model_key)} aria-pressed={v.model_key===selected} className={`rounded-full border px-3 py-2 text-sm font-semibold ${v.model_key===selected?'border-blue-700 bg-blue-700 text-white':'border-slate-300 bg-white text-slate-700 hover:border-blue-400'}`}>{v.display_name}</button>)}</div>
  {active&&<div className="mt-3 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-lg">{active.display_name}</h3><p className="text-sm text-slate-600">{active.market_name} · FAA approved {new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(active.approved_on!))}</p></div><span className="text-xs font-semibold text-emerald-800">Listed in current A16WE</span></div><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <Fact label="Engine" value={facts.engine_family?.text_value??'Not reviewed'}/><Fact label="MTOW" value={value(facts.maximum_takeoff_weight)}/><Fact label="Max passengers" value={value(facts.maximum_passengers)}/><Fact label="Max altitude" value={value(facts.maximum_operating_altitude)}/><Fact label="VMO / MMO" value={`${value(facts.vmo)} / ${value(facts.mmo)}`}/><Fact label="Minimum crew" value={value(facts.minimum_crew)}/>
   </dl>{facts.maximum_passengers&&Object.values(facts.maximum_passengers.conditions).map(note=><p key={note} className="mt-3 text-xs text-amber-900">Capacity condition: {note}</p>)}<p className="mt-3 text-xs text-slate-500">Values are certification limits, not an airline cabin layout or operating recommendation. Select a graph connection for page-cited evidence.</p></div>}
  {pending.map(v=><div key={v.entity_id} className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="font-semibold text-amber-950">{v.display_name}: not listed in current FAA TCDS</p><p className="text-sm text-amber-900">{v.evidence_excerpt} It is shown as a certification boundary and cannot be selected as an approved aircraft model.</p></div>)}
 </section>;
}
function Fact({label,value}:{label:string;value:string}){return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd></div>}
