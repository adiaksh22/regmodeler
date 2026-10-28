import {useEffect,useState} from 'react';
import {loadReviewQueue,type ReviewQueuePage} from '../lib/relatedCatalog';
import SourcePdf from './SourcePdf';
import SourceStatus,{SourceStatusGuide} from './SourceStatus';
import SourceQualityPanel from './SourceQualityPanel';
import {reviewState} from '../domain/sourceStatus';
const empty:ReviewQueuePage={rows:[],total:0,reviewed_count:0};
export default function ReviewQueue({model}:{model:string}) {
  const [status,setStatus]=useState('pending');const [type,setType]=useState('all');
  const [query,setQuery]=useState('');const [offset,setOffset]=useState(0);const [retry,setRetry]=useState(0);
  const [qualityId,setQualityId]=useState('');
  const [result,setResult]=useState<{key:string;page:ReviewQueuePage}|null>(null);
  const key=JSON.stringify([model,status,type,query,offset,retry]);
  const loading=result?.key!==key;const page=loading?empty:result.page;
  useEffect(()=>{
    let active=true;
    const timer=setTimeout(()=>{void loadReviewQueue(model,status,type,query,offset).then(page=>{
      if(active)setResult({key,page});
    });},250);
    return()=>{active=false;clearTimeout(timer);};
  },[model,status,type,query,offset,key]);
  return <section aria-label="Source review coverage" aria-busy={loading}>
    <h2 className="text-lg font-bold mb-2">Evidence review coverage for {model}</h2>
    <p className="text-sm text-slate-600 mb-4">FAA model-index matches are candidates until their original documents and model conditions are reviewed. This queue tracks research coverage, not aircraft compliance. New source observations require renewed evidence review.</p>
    <SourceStatusGuide/>
    <div className="flex flex-wrap gap-3 mb-4">
      <label>Review status <select className="border rounded p-2" value={status} onChange={e=>{setStatus(e.target.value);setOffset(0);}}>{['pending','reviewed','deferred','rejected','all'].map(s=><option key={s} value={s}>{s==='all'?'All review states':reviewState(s).label}</option>)}</select></label>
      <label>Document type <select className="border rounded p-2" value={type} onChange={e=>{setType(e.target.value);setOffset(0);}}><option value="all">ADs and STCs</option><option>AD</option><option>STC</option></select></label>
      <label className="min-w-0">Search records <input type="search" className="border rounded p-2 w-full sm:w-72" maxLength={120} value={query} placeholder="Document number or title" onChange={e=>{setQuery(e.target.value);setOffset(0);}}/></label>
    </div>
    <p role="status" className="text-sm mb-3">{loading?'Loading review coverage…':page.notice??`${page.total} matching records · ${page.reviewed_count} reviewed model connections across all filters`}</p>
    {page.notice&&<button className="text-blue-700 underline" onClick={()=>setRetry(retry+1)}>Try again</button>}
    <ul className="space-y-3">{page.rows.map(r=><li key={r.version_id} className="border rounded-lg p-3 break-words">
      <strong>{r.document_type} {r.document_number}</strong><SourceStatus status={r.review_status} flags={r.quality_flags} explain/>
      <p className="text-sm mt-1">{r.title}</p><p className="text-sm text-slate-600 mt-2">{r.review_reason}</p>
      <p className="text-xs text-slate-500 mt-2">{r.original_archived?'Primary PDF saved':'Primary PDF not saved'}{r.attachments_pending?' · Additional files not yet retrieved':''}</p>
      {!!r.quality_flags?.length&&<button className="block text-sm text-blue-700 underline mt-2" aria-expanded={qualityId===r.version_id} onClick={()=>setQualityId(qualityId===r.version_id?'':r.version_id)}>Source review notes for {r.document_number}</button>}
      {qualityId===r.version_id&&<SourceQualityPanel versionId={r.version_id} model={model}/>}
      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline inline-block mt-2">Open FAA record</a>{r.original_archived&&<div><SourcePdf versionId={r.version_id} label="View primary original"/></div>}
    </li>)}</ul>
    {!loading&&!page.notice&&!page.rows.length&&<p>No records match these filters.</p>}
    <nav aria-label="Review coverage pages" className="flex flex-wrap items-center gap-4 mt-4">
      <button className="border rounded px-3 py-2 disabled:opacity-40" disabled={loading||offset===0} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous</button>
      {!loading&&!page.notice&&<span className="text-sm">{page.rows.length?`${offset+1}–${offset+page.rows.length}`:'0'} of {page.total}</span>}
      <button className="border rounded px-3 py-2 disabled:opacity-40" disabled={loading||!!page.notice||offset+20>=page.total} onClick={()=>setOffset(offset+20)}>Next</button>
    </nav>
  </section>;
}
