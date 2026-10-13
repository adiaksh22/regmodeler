import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ExplorerDetails } from '../domain/explorer';
import type { CatalogDocument } from '../domain/catalog';

export function sourceDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
}

export default function AircraftExplorer({ doc, details }: { doc: CatalogDocument; details: ExplorerDetails }) {
  const [params, setParams] = useSearchParams();
  const models = doc.model.split('|').map(m=>m.trim()).filter(Boolean);
  const selected = models.includes(params.get('model') ?? '') ? params.get('model')! : models.includes('PA-28-181') ? 'PA-28-181' : models[0];
  const [tab, setTab] = useState<'relationships'|'history'>('relationships');
  const [view, setView] = useState<'graph'|'list'>(()=>typeof window!=='undefined' && window.matchMedia?.('(max-width: 639px)').matches?'list':'graph');
  const [evidenceId, setEvidenceId] = useState('');
  const [showAll, setShowAll] = useState(false);
  const links = details.relationships.filter(r=>r.model===selected).sort((a,b)=>
    Number(b.relationship_type==='covered_by')-Number(a.relationship_type==='covered_by') || a.target.localeCompare(b.target,undefined,{numeric:true}));
  const evidence = links.find(r=>r.id===evidenceId) ?? links[0];
  const revisions = [...details.revisions].sort((a,b)=>Number(b.is_current)-Number(a.is_current) || (b.revision_date ?? '').localeCompare(a.revision_date ?? ''));
  return <section className="bg-white rounded-xl border border-slate-200 p-5 mb-6" aria-label="Aircraft data explorer">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
      <div><label htmlFor="aircraft-model" className="block text-sm font-semibold text-slate-600 mb-1">Aircraft model</label>
        <select id="aircraft-model" value={selected} onChange={e=>{setParams({model:e.target.value},{replace:true});setEvidenceId('');}} className="border rounded-lg p-2 font-semibold max-w-full">
          {models.map(model=><option key={model}>{model}</option>)}
        </select>
      </div>
      <div className="text-sm text-slate-600">Last successful source check<br/><strong>{details.lastChecked ? new Date(details.lastChecked).toLocaleString() : 'Not available'}</strong></div>
    </div>
    <p className="text-sm text-slate-600 mb-4">Reviewed coverage: certification-basis references for PA-28-140 and PA-28-181. ADs, STCs, noise requirements, and optional-equipment additions are pending review.</p>
    <div className="flex gap-2 border-b mb-5" role="tablist" aria-label="Explore aircraft data">
      {(['relationships','history'] as const).map(name=><button key={name} id={`tab-${name}`} role="tab" aria-selected={tab===name} aria-controls={`panel-${name}`} onClick={()=>setTab(name)} className={`px-3 py-3 border-b-2 ${tab===name?'border-blue-600 text-blue-700 font-semibold':'border-transparent text-slate-600'}`}>
        {name==='relationships'?'Relationships':`Revision history (${details.revisions.length})`}
      </button>)}
    </div>
    {details.notice && <p role="status" className="text-amber-900 mb-4">{details.notice}</p>}
    {tab==='relationships' && <div role="tabpanel" id="panel-relationships" aria-labelledby="tab-relationships">
      <div className="flex flex-wrap justify-between gap-2 mb-3"><h2 className="font-bold text-lg">How {selected} connects</h2>
        <div className="flex gap-2">{(['graph','list'] as const).map(mode=><button key={mode} onClick={()=>setView(mode)} aria-pressed={view===mode} className={`px-3 py-1 rounded border ${view===mode?'bg-blue-50 border-blue-400':'border-slate-200'}`}>{mode==='graph'?'Graph':'List'}</button>)}</div>
      </div>
      <p className="text-sm text-slate-600 mb-4">Select a connection to read its source evidence. Amendment dates identify the historical certification basis.</p>
      {links.length===0 ? <p className="rounded-lg bg-slate-50 p-4">No reviewed relationships are available for this model in the current TCDS revision.</p> : <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <div className={view==='graph'?'overflow-x-auto mb-5':'mb-5'} aria-label={`${selected} relationship ${view}`}>
          <div className={view==='graph'?'flex items-center min-w-[620px] p-2':'space-y-2'}>
            {view==='graph' && <><div className="w-40 shrink-0 rounded-xl border-2 border-blue-600 bg-blue-50 p-4 text-center"><span className="text-xs text-blue-800">Aircraft model</span><p className="font-bold">{selected}</p></div>
              <svg aria-hidden="true" className="w-20 shrink-0" height={links.length*78} viewBox={`0 0 80 ${links.length*78}`}>
                {links.map((link,index)=><path key={link.id} d={`M0 ${links.length*39} L30 ${links.length*39} L30 ${index*78+39} L80 ${index*78+39}`} fill="none" stroke="#94a3b8" strokeWidth="2"/>)}
              </svg></>}
            <div className={view==='graph'?'flex-1 space-y-2':'space-y-2'}>{links.map(link=><button key={link.id} onClick={()=>setEvidenceId(link.id)} aria-pressed={evidence?.id===link.id} className={`block w-full text-left rounded-lg border p-3 ${view==='graph'?'h-[70px]':''} ${evidence?.id===link.id?'border-blue-600 bg-blue-50':'border-slate-200 hover:bg-slate-50'}`}>
              <span className="block text-xs text-slate-600">{link.relationship_type==='covered_by'?'Covered by':'Certification basis'}</span>
              <span className="font-semibold text-sm">{link.target}</span>
            </button>)}</div>
          </div>
        </div>
        {evidence && <aside aria-label="Relationship source evidence" className="rounded-lg border border-blue-200 bg-blue-50 p-4 lg:sticky lg:top-6">
          <h3 className="font-bold mb-2">{evidence.target}</h3>
          <p className="text-sm mb-2">TCDS {doc.tcds_number} · revision {evidence.evidence_revision} · page {evidence.evidence_page}</p>
          <p className="text-sm leading-relaxed border-l-2 border-blue-400 pl-3">{evidence.evidence_excerpt}</p>
          {Object.entries(evidence.applicability_conditions).map(([key,value])=><p key={key} className="text-sm mt-2"><strong>{key.replaceAll('_',' ')}: </strong>{value}</p>)}
          <a href={evidence.source_url} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-700 underline text-sm mt-3">Open FAA source · see page {evidence.evidence_page}</a>
          {evidence.target_type==='regulatory_provision' && <p className="text-xs text-slate-600 mt-2">This reference is evidenced by the TCDS. Full historical regulation text has not been imported yet.</p>}
        </aside>}
      </div>}
    </div>}
    {tab==='history' && <div role="tabpanel" id="panel-history" aria-labelledby="tab-history">
      <h2 className="font-bold text-lg mb-2">Imported FAA revision history</h2>
      <p className="text-sm text-slate-600 mb-4">These revisions cover TCDS {doc.tcds_number}. Source corrections can produce multiple snapshots with the same revision number.</p>
      {revisions.length===0 && <p>No imported revision history is available.</p>}
      <ol className="space-y-3">{(showAll?revisions:revisions.slice(0,5)).map(rev=><li key={rev.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-3">
        <div><strong>Revision {rev.revision}</strong> <span className={`text-xs rounded px-2 py-1 ${rev.is_current?'bg-green-100 text-green-900':'bg-slate-100 text-slate-700'}`}>{rev.is_current?'Current FAA revision':rev.status}</span>
          <p className="text-sm text-slate-600 mt-2">Issued {sourceDate(rev.revision_date)} · first retrieved {sourceDate(rev.retrieved_at)}</p>
          <p className="text-xs text-slate-500 mt-1">{rev.content_sha256?'Original PDF archived privately':'Verified metadata snapshot'}</p>
        </div><a href={rev.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-sm">Open FAA revision {rev.revision}</a>
      </li>)}</ol>
      {revisions.length>5 && <button onClick={()=>setShowAll(!showAll)} className="text-blue-700 font-semibold mt-4">{showAll?'Show fewer revisions':`Show all ${revisions.length} revisions`}</button>}
    </div>}
  </section>;
}
