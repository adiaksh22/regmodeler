import {useState} from 'react';
import type {OfficialRevision} from '../domain/explorer';
import SourcePdf from './SourcePdf';
export default function RevisionComparison({revisions}:{revisions:OfficialRevision[]}) {
  const [leftId,setLeftId]=useState(revisions[1]?.id??'');
  const [rightId,setRightId]=useState(revisions[0]?.id??'');
  if(revisions.length<2)return null;
  const left=revisions.find(r=>r.id===leftId)??revisions[1];
  const right=revisions.find(r=>r.id===rightId)??revisions[0];
  return <details className="border rounded-lg p-4 mb-4"><summary className="font-semibold cursor-pointer">Compare archived revisions</summary>
    <p className="text-sm text-slate-600 my-3">Compare source metadata and original PDFs. A different PDF fingerprint does not identify which wording changed or its applicability.</p>
    <div className="grid sm:grid-cols-2 gap-4">{[{label:'Earlier snapshot',value:left,update:setLeftId},{label:'Later snapshot',value:right,update:setRightId}].map(item=><div key={item.label}>
      <label className="block text-sm font-semibold">{item.label}<select aria-label={item.label} value={item.value.id} onChange={e=>item.update(e.target.value)} className="block border rounded p-2 w-full mt-1">{revisions.map(r=><option key={r.id} value={r.id}>Revision {r.revision} · {r.revision_date??'date unavailable'} · {r.id.slice(0,8)}</option>)}</select></label>
      <p className="text-sm mt-2">Issued {item.value.revision_date??'not recorded'} · {item.value.status}</p>
      {item.value.content_sha256&&<SourcePdf key={item.value.id} versionId={item.value.id} label="Open comparison PDF"/>}
    </div>)}</div>
    <p className="text-sm font-semibold mt-3">{left.id===right.id?'The same snapshot is selected.':!left.content_sha256||!right.content_sha256?'PDF comparison unavailable for a metadata-only snapshot.':left.content_sha256===right.content_sha256?'The archived PDF bytes are identical.':'The archived PDF bytes differ. Review both originals to identify changes.'}</p>
  </details>;
}
