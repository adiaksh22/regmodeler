import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {catalog} from '../lib/catalog';
import {CROSS_REF_KEY,readPersonalGroups,groupsFingerprint,connectedPersonalGroups,normalizeCertificate,linkCertificates,removePersonalMember,undoPersonalRemoval,PersonalLinkError,type PersonalLinkUndo} from '../utils/crossReferenceManager';

export default function PersonalCrossReferences({number}:{number:string}){
 const [saved,setSaved]=useState(readPersonalGroups);
 const [input,setInput]=useState('');const [notice,setNotice]=useState('');const [invalid,setInvalid]=useState(false);
 const [busy,setBusy]=useState(false);const [undo,setUndo]=useState<PersonalLinkUndo|null>(null);
 const request=useRef({generation:0});const field=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const reload=(event:StorageEvent)=>{if(event.key===CROSS_REF_KEY||event.key===null){setSaved(readPersonalGroups());setNotice('Personal links were updated in another tab.');}};
  const lifecycle=request.current;
  window.addEventListener('storage',reload);return()=>{++lifecycle.generation;window.removeEventListener('storage',reload);};
 },[]);
 const connected=connectedPersonalGroups(saved.groups,[number]);
 const members=connected.members.filter(member=>member!==number);
 const target=normalizeCertificate(input);
 const combined=target?connectedPersonalGroups(saved.groups,[number,target]):null;
 const additional=combined?.members.filter(member=>!connected.members.includes(member)&&member!==target)??[];
 const fail=(error:unknown)=>{setSaved(readPersonalGroups());setNotice(error instanceof PersonalLinkError?error.message:'The link could not be saved. Existing browser records were preserved.');};
 async function submit(){
  if(!target){setInvalid(true);setNotice('Enter a certificate number such as 2A13 or A16WE, up to 20 letters, numbers and hyphens.');return;}
  if(target===number){setInvalid(true);setNotice('Choose a different certificate; a TCDS cannot link to itself.');return;}
  if(connected.members.includes(target)){setInvalid(true);setNotice(`${target} is already in this personal group.`);return;}
  const token=++request.current.generation;setBusy(true);setInvalid(false);setNotice('Checking catalog coverage…');
  try{
   // One targeted public-catalog read on submission; no FAA call or background crawl.
   const destination=await catalog.get(target);if(token!==request.current.generation)return;
   linkCertificates(number,target,groupsFingerprint(saved.groups));setSaved(readPersonalGroups());setInput('');setUndo(null);
   const coverage=destination.data?(destination.source!=='database'?' A saved FAA snapshot is available for this destination.':''):destination.source==='database'?' This certificate is not included in this app’s catalog; its destination page offers FAA DRS lookup.':' Destination coverage could not be checked; its page will retry the catalog lookup.';
   setNotice(`Personal link saved in this browser.${coverage}`);
  }catch(error){if(token===request.current.generation)fail(error);}finally{if(token===request.current.generation)setBusy(false);}
 }
 function remove(member:string){
  try{setUndo(removePersonalMember(number,member,groupsFingerprint(saved.groups)));setSaved(readPersonalGroups());setNotice(`${member} removed from this personal group. Undo is available.`);field.current?.focus();}catch(error){fail(error);}
 }
 function restore(){
  if(!undo)return;
  try{undoPersonalRemoval(undo);setSaved(readPersonalGroups());setUndo(null);setNotice('Personal link group restored.');field.current?.focus();}catch(error){setUndo(null);fail(error);}
 }
 return <section aria-label="Personal cross-references" className="bg-white rounded-lg shadow p-6 mb-6">
  <h2 className="text-xl font-bold text-gray-900 mb-3">Cross-References</h2>
  <p className="text-sm text-gray-600 mb-2">Personal links stored in this browser. These links do not establish regulatory applicability or verify an FAA certificate.</p>
  <p id="personal-link-help" className="text-xs text-gray-600 mb-4">Members of a personal group link to each other. Removing a certificate removes it from that group for every member; FAA records are unchanged. Destination pages show the app’s catalog coverage.</p>
  {!saved.readable?<p role="status" className="text-sm text-amber-900 mb-3">Saved personal links could not be read. Existing browser data has been preserved.</p>:members.length?<ul aria-label="Linked TCDS certificates" className="space-y-2 mb-4">{members.map(member=>{
   const canonical=normalizeCertificate(member);
   return <li key={member} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
    {canonical?<Link to={`/tcds/${encodeURIComponent(canonical)}`} className="font-semibold text-blue-700 underline">TCDS {canonical}</Link>:<span className="text-sm break-all">Unrecognized saved value: {member}</span>}
    <button type="button" disabled={busy} aria-label={`Remove ${member} from personal group`} onClick={()=>remove(member)} className="text-sm text-red-700 underline px-2 py-2 disabled:opacity-50">Remove from group</button>
   </li>;
  })}</ul>:<p className="text-gray-500 mb-4">No cross-references yet.</p>}
  {additional.length>0&&<p role="note" className="mb-3 text-sm text-blue-950 bg-blue-50 rounded-lg p-3">Linking {target} also joins its personal group: {additional.join(', ')}. The combined group will contain {combined!.members.length} certificates.</p>}
  <form onSubmit={event=>{event.preventDefault();void submit();}} className="flex flex-col sm:flex-row gap-2">
   <label className="flex-1 min-w-0 text-sm font-semibold">Certificate number<input ref={field} type="text" maxLength={20} value={input} disabled={busy||!saved.readable} onChange={event=>{setInput(event.target.value);setInvalid(false);}} placeholder="For example, A16WE" aria-label="TCDS number to link" aria-describedby="personal-link-help" aria-invalid={invalid||undefined} className="block border rounded px-3 py-2 mt-1 w-full font-normal"/></label>
   <button disabled={busy||!saved.readable} className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-50 sm:self-end">{busy?'Checking…':additional.length?'Join groups and link':'Link'}</button>
  </form>
  <div className="flex flex-wrap gap-4 mt-3">
   {undo&&<button type="button" onClick={restore} disabled={busy} className="text-sm text-blue-700 underline py-2">Undo removal</button>}
   <button type="button" disabled={busy} onClick={()=>{const next=readPersonalGroups();setSaved(next);setNotice(next.readable?'Personal links reloaded.':'Personal links are still unavailable. Existing browser records were preserved.');}} className="text-sm text-blue-700 underline py-2">Reload personal links</button>
  </div>
  {notice&&<p role="status" className="mt-3 text-sm text-amber-900">{notice}</p>}
 </section>;
}
