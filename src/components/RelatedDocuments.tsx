import {useEffect,useRef,useState} from 'react';
import {loadRelatedChecks,loadRelatedPage,loadRelatedText} from '../lib/relatedCatalog';
import type {RelatedDocument,EvidenceRelationship} from '../domain/explorer';
import SourcePdf from './SourcePdf';
import {profileRelevance,type AircraftProfile} from '../domain/aircraftProfile';
import ProfileRelevance from './ProfileRelevance';
import SourceQualityPanel from './SourceQualityPanel';
import SourceStatus,{SourceStatusGuide} from './SourceStatus';
export default function RelatedDocuments({model,relationships,profile=null}:{model:string;relationships:EvidenceRelationship[];profile?:AircraftProfile|null}) {
  const configuredModels=['PA-28-140','PA-28-181','737-700','737-800','737-900ER','737-7','737-8','737-9'];
  const [documents,setDocuments]=useState<RelatedDocument[]>([]);const [notice,setNotice]=useState('');const [busy,setBusy]=useState(true);
  const [checked,setChecked]=useState<{document_type:string;last_checked:string}[]>([]);
  const [kind,setKind]=useState('AD');const [history,setHistory]=useState(false);const [query,setQuery]=useState('');const [debouncedQuery,setDebouncedQuery]=useState('');const [total,setTotal]=useState(0);
  const [selectedId,setSelectedId]=useState('');const [text,setText]=useState('');const [textBusy,setTextBusy]=useState(false);
  const [profileOnly,setProfileOnly]=useState(false);
  const requestScope=useRef({active:false});
  const relevance=(d:RelatedDocument)=>{const edge=relationships.find(r=>!r.path_via&&r.evidence_version_id===d.id);return edge?profileRelevance(profile,edge):null;};
  useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query),250);return()=>window.clearTimeout(timer);},[query]);
  useEffect(()=>{let stopped=false;void loadRelatedChecks(model).then(rows=>{if(!stopped)setChecked(rows);});return()=>{stopped=true;};},[model]);
  useEffect(()=>{const scope={active:true};requestScope.current=scope;setBusy(true);setDocuments([]);setSelectedId('');setText('');setNotice('');
    void loadRelatedPage(model,kind,history,debouncedQuery).then(r=>{if(scope.active){setDocuments(r.documents);setTotal(r.total);setNotice(r.notice??'');setBusy(false);}});return()=>{scope.active=false;};},[model,kind,history,debouncedQuery]);
  const loadMore=()=>{const scope=requestScope.current;setBusy(true);void loadRelatedPage(model,kind,history,debouncedQuery,documents.length).then(r=>{
    if(!scope.active)return;
    setDocuments(current=>[...current,...r.documents]);setTotal(r.total);setNotice(r.notice??'');setBusy(false);
  });};
  const shown=documents.filter(d=>!profileOnly||relevance(d)?.category!=='outside');
  const selected=shown.find(d=>d.id===selectedId);
  useEffect(()=>{let stopped=false;setText('');if(selected?.document_type==='AD'){setTextBusy(true);void loadRelatedText(selected.id,model).then(t=>{if(!stopped){setText(t??'');setTextBusy(false);}});}return()=>{stopped=true;};},[selected?.id,selected?.document_type,model]);
  return <div>
    <h2 className="font-bold text-lg mb-2">Related FAA records for {model}</h2>
    <p className="text-sm text-slate-600 mb-4">Model-index matches are discovery results. Serial numbers, installed equipment, approval limitations, and individual-aircraft compliance still need review.</p>
    <SourceStatusGuide/>
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <label>Document type <select aria-label="Related document type" value={kind} onChange={e=>{setKind(e.target.value);setSelectedId('');}} className="border rounded p-2 ml-1"><option value="AD">Airworthiness directives</option><option value="STC">Supplemental type certificates</option></select></label>
      <label className="text-sm"><input type="checkbox" checked={history} onChange={e=>{setHistory(e.target.checked);setSelectedId('');}}/> Include history and archived observations</label>
    </div>
    <input aria-label="Filter related records" placeholder="Search number, description, or holder" value={query} onChange={e=>{setQuery(e.target.value);setSelectedId('');}} className="border rounded p-2 w-full mb-3"/>
    {profile&&<label className="block text-sm mb-3"><input type="checkbox" checked={profileOnly} onChange={e=>{setProfileOnly(e.target.checked);setSelectedId('');}}/> Hide records outside reviewed serial ranges. Records needing review remain visible.</label>}
    {checked.find(c=>c.document_type===kind)&&<p className="text-xs text-slate-600 mb-3">{kind} index last checked {new Date(checked.find(c=>c.document_type===kind)!.last_checked).toLocaleString()}</p>}
    {busy&&<p role="status">Loading related FAA records…</p>}{notice&&<p role="status" className="text-amber-900">{notice}</p>}
    {!busy&&!notice&&<p className="text-sm mb-3">Showing {documents.length} of {total} source records {history?'including history':'with current FAA status'}.</p>}
    {!busy&&shown.length===0&&<p>{configuredModels.includes(model)?'No matches in this view. This is not a complete applicability determination.':'Related-source discovery has not been configured for this model yet.'}</p>}
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <div className="space-y-2">{shown.map(d=><button key={d.id} onClick={()=>setSelectedId(d.id)} aria-pressed={selected?.id===d.id} className={`block text-left w-full rounded-lg border p-3 ${selected?.id===d.id?'border-blue-600 bg-blue-50':'border-slate-200'}`}>
        <span className="font-semibold">{d.document_type} {d.document_number}</span><span className="block text-sm text-slate-700 mt-1">{d.title}</span>
        <span className="block text-xs text-slate-600 mt-2">{!d.is_active?'Archived observation':`FAA status: ${d.status}`}</span>
        <SourceStatus status={d.review_status} flags={d.quality_flags}/>
        {profile&&<span className="block text-xs text-blue-800 mt-1">{relevance(d)?.label??'Profile relevance needs review'}</span>}
      </button>)}{documents.length<total&&<button className="text-blue-700 font-semibold" disabled={busy} onClick={loadMore}>Load 24 more</button>}</div>
      {selected&&<aside className="border rounded-lg p-4 bg-slate-50 lg:sticky lg:top-6" aria-label="Related record details">
        <SourceQualityPanel key={selected.id} versionId={selected.id} model={model}/>
        <h3 className="font-bold">{selected.document_type} {selected.document_number}</h3><p className="text-sm mt-2">{selected.title}</p>
        <SourceStatus status={selected.review_status} flags={selected.quality_flags} explain/>
        {selected.effective_date&&<p className="text-sm mt-2">Effective date: {selected.effective_date}</p>}{selected.holder&&<p className="text-sm mt-2">Holder: {selected.holder}</p>}
        {selected.summary&&<p className="text-sm mt-3">{selected.summary}</p>}
        <p className="text-sm mt-3">{selected.candidate_reason}</p>
        {profile&&<ProfileRelevance result={relevance(selected)??{category:'unknown',label:'Profile relevance needs review',explanation:'This source observation has no reviewed configuration rule. A model match or profile entry does not establish applicability.'}}/>}
        {!!selected.superseded_by?.filter(x=>x!=='_EMPTY_').length&&<p className="text-sm mt-2">FAA superseded-by reference: {selected.superseded_by.join(', ')}</p>}
        {!!selected.supersedes?.filter(x=>x!=='_EMPTY_').length&&<p className="text-sm mt-2">FAA supersedes reference: {selected.supersedes.join(', ')}</p>}
        <p className="text-xs mt-3">{selected.original_archived?'Primary PDF saved.':'Metadata saved; primary PDF not saved.'}{selected.attachments_pending?' Additional files not yet retrieved.':''} Retrieval does not establish document completeness.</p>
        <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm block mt-3">Open FAA record</a>
        {selected.original_archived&&<SourcePdf key={selected.id} versionId={selected.id} label="View archived original"/>}
        {selected.document_type==='AD'&&<details className="mt-4"><summary className="cursor-pointer font-semibold text-sm">FAA extracted regulatory text</summary><p className="text-xs text-slate-600 my-2">Extracted text may omit graphics and applicability tables. Use the original for complete source context.</p>{textBusy?<p>Loading text…</p>:<pre className="whitespace-pre-wrap break-words text-xs max-h-96 overflow-auto">{text||'Text unavailable; use the FAA record.'}</pre>}</details>}
      </aside>}
    </div>
  </div>;
}
