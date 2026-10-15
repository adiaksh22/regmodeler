import {useEffect,useState} from 'react';
import {loadRelated,loadRelatedText} from '../lib/relatedCatalog';
import type {RelatedDocument,EvidenceRelationship} from '../domain/explorer';
import SourcePdf from './SourcePdf';
import {profileRelevance,type AircraftProfile} from '../domain/aircraftProfile';
import ProfileRelevance from './ProfileRelevance';
export default function RelatedDocuments({model,relationships,profile=null}:{model:string;relationships:EvidenceRelationship[];profile?:AircraftProfile|null}) {
  const configuredModels=['PA-28-140','PA-28-181','737-700','737-800','737-900ER','737-7','737-8','737-9'];
  const [documents,setDocuments]=useState<RelatedDocument[]>([]);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(true);
  const [checked,setChecked]=useState<{document_type:string;last_checked:string}[]>([]);
  const [kind,setKind]=useState('AD');const [history,setHistory]=useState(false);const [query,setQuery]=useState('');const [limit,setLimit]=useState(12);
  const [selectedId,setSelectedId]=useState('');const [text,setText]=useState('');const [textBusy,setTextBusy]=useState(false);
  const [profileOnly,setProfileOnly]=useState(false);
  const relevance=(d:RelatedDocument)=>{const edge=relationships.find(r=>!r.path_via&&r.evidence_version_id===d.id);return edge?profileRelevance(profile,edge):null;};
  useEffect(()=>{let stopped=false;setBusy(true);setDocuments([]);setSelectedId('');setText('');setLimit(12);
    void loadRelated(model).then(r=>{if(!stopped){setDocuments(r.documents);setChecked(r.checked);setNotice(r.notice??'');setBusy(false);}});return()=>{stopped=true;};},[model]);
  const shown=documents.filter(d=>d.document_type===kind&&(history||(d.is_active&&d.status==='current'))&&[d.document_number,d.title,d.holder??''].some(t=>t.toLowerCase().includes(query.trim().toLowerCase()))&&(!profileOnly||relevance(d)?.category!=='outside')).sort((a,b)=>Number(b.is_active&&b.status==='current')-Number(a.is_active&&a.status==='current')||a.document_number.localeCompare(b.document_number,undefined,{numeric:true})||b.retrieved_at.localeCompare(a.retrieved_at));
  const selected=shown.find(d=>d.id===selectedId);
  useEffect(()=>{let stopped=false;setText('');if(selected?.document_type==='AD'){setTextBusy(true);void loadRelatedText(selected.id,model).then(t=>{if(!stopped){setText(t??'');setTextBusy(false);}});}return()=>{stopped=true;};},[selected?.id,selected?.document_type,model]);
  return <div>
    <h2 className="font-bold text-lg mb-2">Related FAA records for {model}</h2>
    <p className="text-sm text-slate-600 mb-4">Model-index matches are discovery results. Serial numbers, installed equipment, approval limitations, and individual-aircraft compliance still need review.</p>
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <label>Document type <select aria-label="Related document type" value={kind} onChange={e=>{setKind(e.target.value);setSelectedId('');setLimit(12);}} className="border rounded p-2 ml-1"><option value="AD">Airworthiness directives</option><option value="STC">Supplemental type certificates</option></select></label>
      <label className="text-sm"><input type="checkbox" checked={history} onChange={e=>{setHistory(e.target.checked);setSelectedId('');setLimit(12);}}/> Include history and archived observations</label>
    </div>
    <input aria-label="Filter related records" placeholder="Filter by number, description, or holder" value={query} onChange={e=>{setQuery(e.target.value);setSelectedId('');setLimit(12);}} className="border rounded p-2 w-full mb-3"/>
    {profile&&<label className="block text-sm mb-3"><input type="checkbox" checked={profileOnly} onChange={e=>{setProfileOnly(e.target.checked);setSelectedId('');}}/> Hide records outside reviewed serial ranges. Records needing review remain visible.</label>}
    {checked.find(c=>c.document_type===kind)&&<p className="text-xs text-slate-600 mb-3">{kind} index last checked {new Date(checked.find(c=>c.document_type===kind)!.last_checked).toLocaleString()}</p>}
    {busy&&<p role="status">Loading related FAA records…</p>}{notice&&<p role="status" className="text-amber-900">{notice}</p>}
    {!busy&&!notice&&<p className="text-sm mb-3">{shown.length} source records {history?'including history':'with current FAA status'}.</p>}
    {!busy&&shown.length===0&&<p>{configuredModels.includes(model)?'No matches in this view. This is not a complete applicability determination.':'Related-source discovery has not been configured for this model yet.'}</p>}
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <div className="space-y-2">{shown.slice(0,limit).map(d=><button key={d.id} onClick={()=>setSelectedId(d.id)} aria-pressed={selected?.id===d.id} className={`block text-left w-full rounded-lg border p-3 ${selected?.id===d.id?'border-blue-600 bg-blue-50':'border-slate-200'}`}>
        <span className="font-semibold">{d.document_type} {d.document_number}</span><span className="block text-sm text-slate-700 mt-1">{d.title}</span>
        <span className="block text-xs text-slate-600 mt-2">{!d.is_active?'Archived observation':`FAA status: ${d.status}`}{relationships.some(r=>r.evidence_version_id===d.id)?' · Source connection reviewed':' · Metadata match'}</span>
        {profile&&<span className="block text-xs text-blue-800 mt-1">{relevance(d)?.label??'Profile relevance needs review'}</span>}
      </button>)}{shown.length>limit&&<button className="text-blue-700 font-semibold" onClick={()=>setLimit(limit+24)}>Show more records</button>}</div>
      {selected&&<aside className="border rounded-lg p-4 bg-slate-50 lg:sticky lg:top-6" aria-label="Related record details">
        <h3 className="font-bold">{selected.document_type} {selected.document_number}</h3><p className="text-sm mt-2">{selected.title}</p>
        {selected.effective_date&&<p className="text-sm mt-2">Effective date: {selected.effective_date}</p>}{selected.holder&&<p className="text-sm mt-2">Holder: {selected.holder}</p>}
        {selected.summary&&<p className="text-sm mt-3">{selected.summary}</p>}
        <p className="text-sm mt-3">{selected.candidate_reason}</p>
        {profile&&<ProfileRelevance result={relevance(selected)??{category:'unknown',label:'Profile relevance needs review',explanation:'This source observation has no reviewed configuration rule. A model match or profile entry does not establish applicability.'}}/>}
        {!!selected.superseded_by?.filter(x=>x!=='_EMPTY_').length&&<p className="text-sm mt-2">FAA superseded-by reference: {selected.superseded_by.join(', ')}</p>}
        {!!selected.supersedes?.filter(x=>x!=='_EMPTY_').length&&<p className="text-sm mt-2">FAA supersedes reference: {selected.supersedes.join(', ')}</p>}
        <p className="text-xs mt-3">{selected.original_archived?'Original PDF archived.':'Original metadata archived; primary PDF not archived.'}{selected.attachments_pending?' Additional attachments remain pending.':''}</p>
        <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm block mt-3">Open FAA record</a>
        {selected.original_archived&&<SourcePdf key={selected.id} versionId={selected.id} label="View archived original"/>}
        {selected.document_type==='AD'&&<details className="mt-4"><summary className="cursor-pointer font-semibold text-sm">FAA extracted regulatory text</summary><p className="text-xs text-slate-600 my-2">Extracted text may omit graphics and applicability tables. Use the original for complete source context.</p>{textBusy?<p>Loading text…</p>:<pre className="whitespace-pre-wrap break-words text-xs max-h-96 overflow-auto">{text||'Text unavailable; use the FAA record.'}</pre>}</details>}
      </aside>}
    </div>
  </div>;
}
