import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ExplorerDetails } from '../domain/explorer';
import type { CatalogDocument } from '../domain/catalog';
import RelatedDocuments from './RelatedDocuments';
import SourcePdf from './SourcePdf';
import PublisherSource from './PublisherSource';
import {relationshipLabel} from '../domain/nodeGraph';
import RevisionComparison from './RevisionComparison';
import AircraftProfileEditor from './AircraftProfileEditor';
import ProfileRelevance from './ProfileRelevance';
import {profileRelevance,type AircraftProfile} from '../domain/aircraftProfile';
import AircraftFamilySummary from './AircraftFamilySummary';
import ApplicabilityLogic from './ApplicabilityLogic';
import SourceQualityPanel from './SourceQualityPanel';
import SourceStatus from './SourceStatus';
import SourceMonitoring from './SourceMonitoring';
import {monitoredSources,sourceHealth} from '../domain/sourceHealth';
import {aircraftModelIdentity} from '../domain/aircraftModelIdentity';
import {loadRelationshipEvidence,loadRevisionHistory} from '../lib/catalog';
import type {ApplicabilityRule,OfficialRevision,RegulationSource} from '../domain/explorer';

const NodeGraph=lazy(()=>import('./NodeGraph'));
const ReviewQueue=lazy(()=>import('./ReviewQueue'));

export function sourceDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
}

export default function AircraftExplorer({ doc, details }: { doc: CatalogDocument; details: ExplorerDetails }) {
  const [params, setParams] = useSearchParams();
  const models = doc.model.split('|').map(m=>aircraftModelIdentity(doc.tcds_number,m.trim())).filter(Boolean);
  const requestedModel=aircraftModelIdentity(doc.tcds_number,params.get('model')??'');
  const selected = models.includes(requestedModel) ? requestedModel : models.includes('PA-28-181') ? 'PA-28-181' : models[0];
  const [tab, setTab] = useState<'relationships'|'history'|'related'|'review'>('relationships');
  const [expanded, setExpanded] = useState('');
  const [view, setView] = useState<'graph'|'list'|'nodes'>(()=>typeof window!=='undefined' && window.matchMedia?.('(max-width: 639px)').matches?'list':'nodes');
  const [evidenceId, setEvidenceId] = useState('');
  const [compareModels,setCompareModels]=useState(false);
  const [showAll, setShowAll] = useState(false);
  const [profile,setProfile] = useState<AircraftProfile|null>(null);
  const [profileDirty,setProfileDirty] = useState(false);
  const [profileOnly,setProfileOnly] = useState(false);
  const [revisions,setRevisions]=useState<OfficialRevision[]>(details.revisions);
  const [historyState,setHistoryState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
  const [evidenceRules,setEvidenceRules]=useState<ApplicabilityRule[]>([]);
  const [sourceMaterials,setSourceMaterials]=useState<RegulationSource[]>([]);
  const [evidenceLoading,setEvidenceLoading]=useState(false);
  const allLinks = details.relationships.filter(r=>r.model===selected);
  const relevantEquipmentKeys=new Set(allLinks.filter(r=>!r.path_via&&typeof r.applicability_conditions.equipment_key==='string').map(r=>r.applicability_conditions.equipment_key));
  const equipmentOptions=[...new Map(allLinks.filter(r=>r.relationship_type==='affects_component'&&r.basis_key&&relevantEquipmentKeys.has(r.basis_key)).map(r=>[r.basis_key!,{key:r.basis_key!,label:r.target}])).values()].sort((a,b)=>a.label.localeCompare(b.label));
  const activeProfile = profile?.model===selected?profile:null;
  const rowHeight = activeProfile?104:78;
  const links = allLinks.filter(r=>expanded?r.path_via===expanded:!r.path_via).filter(r=>!profileOnly||profileRelevance(activeProfile,r)?.category!=='outside').sort((a,b)=>
    Number(b.relationship_type==='covered_by')-Number(a.relationship_type==='covered_by') || a.target.localeCompare(b.target,undefined,{numeric:true}));
  const nodeLinks=details.relationships.filter(r=>compareModels||r.model===selected).filter(r=>!profileOnly||r.model!==selected||profileRelevance(activeProfile,r)?.category!=='outside');
  const evidence = (view==='nodes'?nodeLinks:links).find(r=>r.id===evidenceId) ?? (view==='nodes'?nodeLinks:links)[0];
  const activeEvidenceId=evidence?.id;
  const activeBasisKey=evidence?.basis_key;
  const activeTargetType=evidence?.target_type;
  const sortedRevisions = [...revisions].sort((a,b)=>Number(b.is_current)-Number(a.is_current) || (b.revision_date ?? '').localeCompare(a.revision_date ?? ''));
  const healthWarnings=details.monitoring?.filter(check=>monitoredSources.some(source=>source.source===check.source&&source.certificate===doc.tcds_number)&&sourceHealth(check).attention).length??0;
  useEffect(()=>{if(tab!=='history')return;let stopped=false;setHistoryState('loading');void loadRevisionHistory(doc.tcds_number).then(rows=>{if(!stopped){setRevisions(rows);setHistoryState('ready');}}).catch(()=>{if(!stopped)setHistoryState('error');});return()=>{stopped=true;};},[tab,doc.tcds_number]);
  useEffect(()=>{if(!evidenceId||!activeEvidenceId)return;let stopped=false;setEvidenceLoading(true);setEvidenceRules([]);setSourceMaterials([]);void loadRelationshipEvidence(activeEvidenceId,activeTargetType==='regulatory_provision'?activeBasisKey:undefined).then(result=>{if(!stopped){setEvidenceRules(result.rules);setSourceMaterials(result.materials);setEvidenceLoading(false);}}).catch(()=>{if(!stopped)setEvidenceLoading(false);});return()=>{stopped=true;};},[evidenceId,activeEvidenceId,activeBasisKey,activeTargetType]);
  const chooseModel=(model:string)=>{if(profileDirty&&!window.confirm('Discard unsaved aircraft profile edits before switching models?'))return;setProfileDirty(false);setParams({model},{replace:true});setEvidenceId('');setExpanded('');};
  return <section className="bg-white rounded-xl border border-slate-200 p-5 mb-6" aria-label="Aircraft data explorer">
    <AircraftFamilySummary variants={details.variants??[]} selected={selected} onSelect={chooseModel}/>
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div><label htmlFor="aircraft-model" className="block text-sm font-semibold text-slate-600 mb-1">Aircraft model</label>
        <select id="aircraft-model" value={selected} onChange={e=>chooseModel(e.target.value)} className="border rounded-lg p-2 font-semibold max-w-full">
          {models.map(model=><option key={model}>{model}</option>)}
        </select>
      </div>
      <div className="text-sm text-slate-600">TCDS last successful source check<br/><strong>{details.lastChecked ? new Date(details.lastChecked).toLocaleString() : 'Not available'}</strong></div>
    </div>
    <p className="text-sm text-slate-600 mb-4">Reviewed connections are limited to the cited FAA evidence shown here. Related records may contain additional model-index matches. Individual-aircraft applicability and compliance are not determined here.</p>
    {details.monitoring&&<details className={`mb-4 rounded-lg border p-3 ${healthWarnings?'border-amber-300 bg-amber-50':'border-slate-200'}`}><summary className="cursor-pointer text-sm font-semibold">Source check health and monitoring limits{healthWarnings?` · ${healthWarnings} ${healthWarnings===1?'check needs':'checks need'} attention`:''}</summary><SourceMonitoring checks={details.monitoring} certificate={doc.tcds_number}/></details>}
    {selected.startsWith('PA-28')?<AircraftProfileEditor key={selected} model={selected} equipmentOptions={equipmentOptions} onChange={setProfile} onDirty={setProfileDirty}/>:<p className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Configuration profiles will appear for this model after component and AD applicability rules are reviewed. Family and certification links are available now.</p>}
    <div className="flex flex-wrap gap-2 border-b mb-5" role="tablist" aria-label="Explore aircraft data">
      {(['relationships','history','related','review'] as const).map(name=><button key={name} id={`tab-${name}`} role="tab" aria-selected={tab===name} aria-controls={`panel-${name}`} onClick={()=>setTab(name)} className={`px-3 py-3 border-b-2 ${tab===name?'border-blue-600 text-blue-700 font-semibold':'border-transparent text-slate-600'}`}>
        {name==='review'?'Review coverage':name==='relationships'?'Relationships':name==='related'?'Related ADs & STCs':historyState==='ready'?`Revision history (${revisions.length})`:'Revision history'}
      </button>)}
    </div>
    {details.notice && <p role="status" className="text-amber-900 mb-4">{details.notice}</p>}
    {tab==='relationships' && <div role="tabpanel" id="panel-relationships" aria-labelledby="tab-relationships">
      <div className="flex flex-wrap justify-between gap-2 mb-3"><h2 className="font-bold text-lg">How {expanded||selected} connects</h2>
        <div className="flex gap-2">{(['nodes','graph','list'] as const).map(mode=><button key={mode} onClick={()=>setView(mode)} aria-pressed={view===mode} className={`px-3 py-1 rounded border ${view===mode?'bg-blue-50 border-blue-400':'border-slate-200'}`}>{mode==='nodes'?'Node map':mode==='graph'?'Paths':'Evidence list'}</button>)}</div>
      </div>
      <p className="text-sm text-slate-600 mb-4">Select a connection to read its source evidence. Amendment dates identify the historical certification basis.</p>
      {activeProfile&&<label className="block text-sm mb-4"><input type="checkbox" checked={profileOnly} onChange={e=>setProfileOnly(e.target.checked)}/> Hide connections outside reviewed serial or reported equipment scope. Unknown relevance remains visible.</label>}
      {view==='nodes'&&<label className="block text-sm mb-3"><input type="checkbox" checked={compareModels} onChange={e=>setCompareModels(e.target.checked)}/> Show shared relationships across every reviewed model in this TCDS</label>}
      {view!=='nodes'&&expanded&&<button className="text-blue-700 underline mb-4" onClick={()=>{setExpanded('');setEvidenceId('');}}>Back to {selected}</button>}
      {(view==='nodes'?nodeLinks:links).length===0 ? details.available&&<p className="rounded-lg bg-slate-50 p-4">No reviewed relationships are available for this model in the current TCDS revision.</p> : <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        {view==='nodes'?<Suspense fallback={<p>Loading node view?</p>}><NodeGraph key={selected+String(compareModels)} rows={nodeLinks} selectedId={evidence?.id??''} onSelect={r=>setEvidenceId(r.id)}/></Suspense>:<div className={view==='graph'?'overflow-x-auto mb-5':'mb-5'} aria-label={`${selected} relationship ${view}`}>
          <div className={view==='graph'?'flex items-center min-w-[620px] p-2':'space-y-2'}>
            {view==='graph' && <><div className="w-40 shrink-0 rounded-xl border-2 border-blue-600 bg-blue-50 p-4 text-center"><span className="text-xs text-blue-800">{expanded?'Selected source':'Aircraft model'}</span><p className="font-bold">{expanded||selected}</p></div>
              <svg aria-hidden="true" className="w-20 shrink-0" height={links.length*rowHeight} viewBox={`0 0 80 ${links.length*rowHeight}`}>
                <defs><marker id="graph-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto-start-reverse"><path d="M0 0 L6 3 L0 6 Z" fill="#64748b"/></marker></defs>
                {links.map((link,index)=><path key={link.id} d={`M4 ${links.length*rowHeight/2} L30 ${links.length*rowHeight/2} L30 ${index*rowHeight+rowHeight/2} L76 ${index*rowHeight+rowHeight/2}`} fill="none" stroke="#94a3b8" strokeWidth="2" markerStart={link.direction==='incoming'?'url(#graph-arrow)':undefined} markerEnd={link.direction==='incoming'?undefined:'url(#graph-arrow)'}/>)}
              </svg></>}
            <div className={view==='graph'?'flex-1 space-y-2':'space-y-2'}>{links.map(link=><button key={link.id} onClick={()=>setEvidenceId(link.id)} aria-pressed={evidence?.id===link.id} className={`block w-full text-left rounded-lg border p-3 ${view==='graph'?(activeProfile?'h-[96px]':'h-[70px]'):''} ${evidence?.id===link.id?'border-blue-600 bg-blue-50':'border-slate-200 hover:bg-slate-50'}`}>
              <span className="block text-xs text-slate-600">{relationshipLabel(link.relationship_type)}</span>
              <span className="font-semibold text-sm">{link.target}</span>
              {profileRelevance(activeProfile,link)&&<span className="block text-xs text-blue-800">{profileRelevance(activeProfile,link)!.label}</span>}
            </button>)}</div>
          </div>
        </div>
        }
        {evidence && <aside aria-label="Relationship source evidence" className="rounded-lg border border-blue-200 bg-blue-50 p-4 lg:sticky lg:top-6">
          <h3 className="font-bold mb-2">{evidence.target}</h3><p className="text-xs mb-2">Model context: {evidence.model}</p>
          <SourceStatus status="reviewed" explain/>
          <p className="text-sm mb-2">{evidence.source_document_type??'TCDS'} {evidence.source_document_number??doc.tcds_number} · {evidence.evidence_revision} · page {evidence.evidence_page}</p>
          <p className="text-sm leading-relaxed border-l-2 border-blue-400 pl-3">{evidence.evidence_excerpt}</p>
          <ProfileRelevance result={profileRelevance(activeProfile,evidence)}/>
          {!!evidenceId&&evidence.evidence_version_id&&<SourceQualityPanel key={evidence.id} versionId={evidence.evidence_version_id} model={evidence.model}/>}
          {!evidenceId&&<button className="text-blue-700 underline text-sm mt-3" onClick={()=>setEvidenceId(evidence.id)}>Load detailed applicability</button>}
          {evidenceLoading&&<p className="text-xs text-slate-600 mt-2" role="status">Loading detailed evidence...</p>}
          <ApplicabilityLogic rules={evidenceRules}/>
          {Object.entries(evidence.applicability_conditions).filter(([key])=>!key.startsWith('publisher_')&&key!=='equipment_key').map(([key,value])=><p key={key} className="text-sm mt-2"><strong>{key.replaceAll('_',' ')}: </strong>{value}</p>)}
          <PublisherSource conditions={evidence.applicability_conditions}/>
          <a href={evidence.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-700 underline text-sm mt-3">{evidence.original_source_url?'Open FAA record':`Open FAA source · see page ${evidence.evidence_page}`}</a>
          {evidence.original_source_url&&<a href={evidence.original_source_url} target="_blank" rel="noopener noreferrer" className="block text-blue-700 underline text-sm mt-3">Open published original · see PDF page {evidence.evidence_page}</a>}
          {evidence.evidence_version_id&&<SourcePdf key={evidence.evidence_version_id+(evidence.evidence_attachment_id??'')} versionId={evidence.evidence_version_id} attachmentId={evidence.evidence_attachment_id??undefined} page={evidence.evidence_page}/>}
          {allLinks.some(r=>r.path_via===evidence.target)&&<button className="block text-blue-700 underline mt-3 text-sm" onClick={()=>{setExpanded(evidence.target);setEvidenceId('');}}>Explore referenced documents</button>}
          {evidence.evidence_file_name&&<p className="text-xs mt-2">Cited attachment: {evidence.evidence_file_name}</p>}
          {evidence.target_type==='regulatory_provision'&&<div className="mt-4 space-y-3">
            {sourceMaterials.filter(s=>s.basis_key===evidence.basis_key).map(s=><details key={s.id} className="border-t border-blue-200 pt-3"><summary className="cursor-pointer text-sm font-semibold">{s.title}</summary><p className="text-xs my-2">{s.source_kind==='later_reference'?'Later reference edition dated '+s.edition_date+'. This is not the historical amendment wording cited by the TCDS.':'Historical original dated '+s.edition_date+'. The baseline and selected amendments do not form a complete consolidated certification basis.'}</p>{s.body_text?<pre className="text-xs whitespace-pre-wrap max-h-80 overflow-auto">{s.body_text}</pre>:<SourcePdf versionId={s.id} label="View historical original"/>}<a className="text-xs text-blue-700 underline block mt-2" href={s.source_url} target="_blank" rel="noopener noreferrer">Open official regulation source</a></details>)}
            {!!evidenceId&&!evidenceLoading&&!sourceMaterials.some(s=>s.basis_key===evidence.basis_key)&&<p className="text-xs text-slate-600">The cited historical wording has not been imported yet.</p>}
          </div>}
        </aside>}
      </div>}
    </div>}
    {tab==='history' && <div role="tabpanel" id="panel-history" aria-labelledby="tab-history">
      <h2 className="font-bold text-lg mb-2">Imported FAA revision history</h2>
      <p className="text-sm text-slate-600 mb-4">These revisions cover TCDS {doc.tcds_number}. Source corrections can produce multiple snapshots with the same revision number.</p>
      {historyState==='loading'&&<p role="status">Loading revision history...</p>}
      {historyState==='error'&&<p role="status" className="text-amber-900">Revision history is temporarily unavailable.</p>}
      {historyState==='ready'&&sortedRevisions.length===0 && <p>No imported revision history is available.</p>}
      {historyState==='ready'&&<RevisionComparison revisions={sortedRevisions}/>}
      <ol className="space-y-3">{(showAll?sortedRevisions:sortedRevisions.slice(0,5)).map(rev=><li key={rev.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-3">
        <div><strong>Revision {rev.revision}</strong> <span className={`text-xs rounded px-2 py-1 ${rev.is_current?'bg-green-100 text-green-900':'bg-slate-100 text-slate-700'}`}>{rev.is_current?'Current FAA revision':rev.status}</span>
          <p className="text-sm text-slate-600 mt-2">Issued {sourceDate(rev.revision_date)} · first retrieved {sourceDate(rev.retrieved_at)}</p>
          <p className="text-xs text-slate-500 mt-1">{rev.content_sha256?'Original PDF archived privately':'Verified metadata snapshot'}</p>
        </div><div><a href={rev.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm block">Open FAA revision {rev.revision}</a>{rev.content_sha256&&<SourcePdf versionId={rev.id} label={`View archived revision ${rev.revision}`}/>}</div>
      </li>)}</ol>
      {sortedRevisions.length>5 && <button onClick={()=>setShowAll(!showAll)} className="text-blue-700 font-semibold mt-4">{showAll?'Show fewer revisions':`Show all ${sortedRevisions.length} revisions`}</button>}
    </div>}
    {tab==='review'&&<div role="tabpanel" id="panel-review" aria-labelledby="tab-review"><Suspense fallback={<p>Loading review coverage?</p>}><ReviewQueue key={selected} model={selected}/></Suspense></div>}
    {tab==='related'&&<div role="tabpanel" id="panel-related" aria-labelledby="tab-related"><RelatedDocuments model={selected} relationships={allLinks} profile={activeProfile}/></div>}
  </section>;
}
