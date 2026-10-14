import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {loadSourceChanges} from '../lib/sourceChanges';
import {changeLabel,type SourceChange,type SourceMonitoring} from '../domain/sourceChanges';
import SourcePdf from './SourcePdf';
export default function SourceChanges(){
  const [model,setModel]=useState('');const [kind,setKind]=useState('');const [page,setPage]=useState(0);const [reload,setReload]=useState(0);
  const [events,setEvents]=useState<SourceChange[]>([]);const [checks,setChecks]=useState<SourceMonitoring[]>([]);const [notice,setNotice]=useState('');const [total,setTotal]=useState(0);const [busy,setBusy]=useState(true);
  useEffect(()=>{let cancelled=false;setBusy(true);setEvents([]);void loadSourceChanges(model,kind,page*20).then(r=>{if(!cancelled){setEvents(r.events);setChecks(r.monitoring);setTotal(r.total);setNotice(r.notice);setBusy(false);}});return()=>{cancelled=true;};},[model,kind,page,reload]);
  return <section className="bg-white border rounded-xl p-5" aria-label="Shared source change feed">
    <h1 className="text-2xl font-bold mb-3">FAA source changes</h1>
    <p className="text-sm text-slate-600 mb-4">Traceable changes in checked source observations. First checks establish a baseline; discovery dates are not issuance dates. TCDS checks include PDF bytes; AD/STC checks currently monitor metadata. Applicability and compliance require source review.</p>
    <div className="flex flex-wrap gap-3 mb-4"><label className="text-sm">Model<select aria-label="Change feed model" value={model} onChange={e=>{setModel(e.target.value);setPage(0);}} className="block border rounded p-2"><option value="">Both supported models</option><option>PA-28-140</option><option>PA-28-181</option></select></label>
      <label className="text-sm">Source type<select aria-label="Change feed source type" value={kind} onChange={e=>{setKind(e.target.value);setPage(0);}} className="block border rounded p-2"><option value="">All types</option><option>TCDS</option><option>AD</option><option>STC</option></select></label><button className="text-blue-700 underline" onClick={()=>setReload(n=>n+1)}>Reload source checks</button></div>
    {checks.map(c=><p key={c.source} className="text-xs text-slate-600 mb-2">{c.source.includes('TCDSMODEL')?'TCDS':c.source.includes('ADFRAWD')?'AD':'STC'}: last successful check {c.last_success?new Date(c.last_success).toLocaleString():'not recorded'} · latest attempt {c.status??'not recorded'} · {c.baseline_ready?'baseline established':'baseline pending'}</p>)}
    {busy&&<p role="status">Loading source changes…</p>}{notice&&<p role="status" className="text-amber-900">{notice}</p>}
    {!busy&&!notice&&events.length===0&&<p className="bg-slate-50 rounded p-3 mt-3">No recorded events in this view. This feed covers observations after its baseline and is not a complete regulatory change history.</p>}
    <ol className="space-y-3 mt-4">{events.map(e=><li key={e.id} className="border rounded p-4">
      <strong>{e.document_type} {e.document_number}</strong><p className="text-sm mt-1">{changeLabel(e.kind)}</p><p className="text-xs text-slate-600 mt-1">Detected {new Date(e.detected_at).toLocaleString()} · {e.models.join(', ')}</p>
      {!!e.changed_fields.length&&<p className="text-sm mt-2">Changed fields: {e.changed_fields.map(f=>f.replaceAll('_',' ')).join(', ')}. This does not identify changed regulatory wording.</p>}
      {e.changed_fields.includes('source_status')&&<p className="text-sm mt-2">Observed FAA status: {e.old_source_status??'not recorded'} → {e.new_source_status??'not recorded'}</p>}
      <p className="text-sm text-amber-900 mt-2">{e.kind==='missing_from_index'?'Index absence requires investigation; it does not establish withdrawal.':'Aircraft relevance and renewed relationship review may be required.'}</p>
      <details className="mt-3"><summary className="text-sm font-semibold cursor-pointer">Compare stored metadata observations</summary><div className="grid sm:grid-cols-2 gap-3 mt-2">{[{label:'Previous observation',metadata:e.old_metadata,status:e.old_source_status},{label:'Observed snapshot',metadata:e.new_metadata,status:e.new_source_status}].map(s=><div key={s.label} className="bg-slate-50 rounded p-3 text-xs"><strong>{s.label}</strong><p className="mt-2">FAA status: {s.status??'not observed'}</p>{s.metadata?Object.entries(s.metadata).map(([field,value])=><p key={field} className="mt-1 break-words"><strong>{field.replaceAll('_',' ')}: </strong>{value??'not recorded'}</p>):<p className="mt-2">No snapshot on this side of the event.</p>}</div>)}</div></details>
      {e.old_source_url&&e.old_source_url===e.new_source_url&&<p className="text-xs text-slate-600 mt-2">Both observations use the same FAA record address. That page may now show later content; the stored observations preserve the comparison.</p>}
      <div className="flex flex-wrap gap-4 mt-2">{e.old_source_url&&<a className="text-blue-700 underline text-sm" href={e.old_source_url} target="_blank" rel="noopener noreferrer">Previous FAA source · {e.old_revision}</a>}{e.new_source_url&&<a className="text-blue-700 underline text-sm" href={e.new_source_url} target="_blank" rel="noopener noreferrer">Observed FAA source · {e.new_revision}</a>}
      {e.models.map(m=><Link key={m} to={`/tcds/2A13?model=${m}`} className="text-blue-700 underline text-sm">Explore {m} evidence</Link>)}</div>
      {e.document_type==='TCDS'&&<div className="flex flex-wrap gap-3">{e.old_version_id&&<SourcePdf versionId={e.old_version_id} label="Previous archived PDF"/>}{e.new_version_id&&<SourcePdf versionId={e.new_version_id} label="Observed archived PDF"/>}</div>}
    </li>)}</ol>
    {!busy&&total>20&&<div className="flex gap-4 mt-3"><button disabled={page===0} onClick={()=>setPage(n=>n-1)} className="text-blue-700 disabled:opacity-40">Previous</button><span>Page {page+1}</span><button disabled={(page+1)*20>=total} onClick={()=>setPage(n=>n+1)} className="text-blue-700 disabled:opacity-40">Next</button></div>}
  </section>;
}
