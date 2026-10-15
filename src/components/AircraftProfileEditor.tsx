import {useEffect,useState} from 'react';
import {profileModels,validateProfile,type AircraftProfile,type InstallationStatus} from '../domain/aircraftProfile';
import {emptyProfiles,PROFILE_KEY,readProfiles,writeProfiles,profileStoreFingerprint,type ProfileStore} from '../lib/profileStorage';

const blank = (model:string):AircraftProfile => ({id:crypto.randomUUID(),model,name:`My ${model}`,serial:'',modifications:[],equipment:[],updatedAt:new Date().toISOString()});
export default function AircraftProfileEditor({model,equipmentOptions,onChange,onDirty}:{model:string;equipmentOptions:{key:string;label:string}[];onChange:(profile:AircraftProfile|null)=>void;onDirty?:(dirty:boolean)=>void}) {
  const [loaded]=useState(readProfiles);
  const [store,setStore]=useState(loaded.store);
  const [writable,setWritable]=useState(loaded.writable);
  const [notice,setNotice]=useState(loaded.notice);
  const active=store.profiles.find(p=>p.id===store.activeIds[model]&&p.model===model)??null;
  const [draft,setDraft]=useState<AircraftProfile>(()=>active??blank(model));
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{onChange(active);},[active,onChange]);
  useEffect(()=>{onDirty?.(dirty);},[dirty,onDirty]);
  const supported=profileModels.includes(model as typeof profileModels[number]);
  if(!supported)return <p className="rounded bg-slate-50 p-3 text-sm mb-4">Configuration profiles currently support PA-28-140 and PA-28-181. Other models remain available for source browsing.</p>;
  const edit=(next:AircraftProfile)=>{setDraft(next);setDirty(true);if(writable)setNotice('');};
  function persist(next:ProfileStore,message:string){
    const latest=readProfiles();
    if(!latest.writable||profileStoreFingerprint(latest.store)!==profileStoreFingerprint(store)){setNotice('Saved profiles changed or became unavailable. Reload saved profiles before saving; your current draft has been preserved.');return false;}
    if(!writeProfiles(next)){setNotice('The profile was not saved: storage is unavailable, full, or exceeds the profile size limit. Your current draft remains here.');return false;}
    setStore(next);setDirty(false);setNotice(message);return true;
  }
  function save(){
    const normalized={...draft,name:draft.name.trim(),serial:draft.serial.trim().toUpperCase(),modifications:draft.modifications.map(m=>({...m,number:m.number.trim().toUpperCase(),note:m.note.trim()})),equipment:(draft.equipment??[]).map(e=>({...e,note:e.note.trim()})),updatedAt:new Date().toISOString()};
    const error=validateProfile(normalized);if(error){setNotice(error);return;}
    if(store.profiles.some(p=>p.id!==draft.id&&p.model===model&&p.name.toLowerCase()===normalized.name.toLowerCase())){setNotice('Use a different profile name to distinguish your saved aircraft.');return;}
    if(store.profiles.length>=100&&!store.profiles.some(p=>p.id===draft.id)){setNotice('This browser supports up to 100 profiles. Delete an unused profile before adding another.');return;}
    const next={...store,profiles:[...store.profiles.filter(p=>p.id!==normalized.id),normalized],activeIds:{...store.activeIds,[model]:normalized.id}};
    if(persist(next,'Profile saved in this browser.'))setDraft(normalized);
  }
  function choose(id:string){
    if(dirty&&!window.confirm('Discard unsaved profile edits?'))return;
    const found=store.profiles.find(p=>p.id===id&&p.model===model);
    const activeIds={...store.activeIds};if(found)activeIds[model]=id;else delete activeIds[model];
    if(persist({...store,activeIds},found?'Saved profile selected.':'Browsing without a profile.'))setDraft(found??blank(model));
  }
  function reset(){
    if(!window.confirm('Remove only RegModeler aircraft profiles from this browser? Existing source notes and links will remain.'))return;
    try{localStorage.removeItem(PROFILE_KEY);setWritable(true);setStore(emptyProfiles());setDraft(blank(model));setDirty(false);setNotice('Aircraft profile storage reset.');}catch{setNotice('Browser storage is unavailable. No saved data was changed.');}
  }
  function remove(){
    const saved=store.profiles.find(p=>p.id===draft.id);if(!saved||!window.confirm(`Delete the saved profile "${saved.name}" from this browser?`))return;
    const activeIds={...store.activeIds};if(activeIds[model]===saved.id)delete activeIds[model];
    if(persist({...store,profiles:store.profiles.filter(p=>p.id!==saved.id),activeIds},'Profile deleted.'))setDraft(blank(model));
  }
  function exportProfiles(){
    const url=URL.createObjectURL(new Blob([JSON.stringify(store,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='regmodeler-aircraft-profiles.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function reloadProfiles(){
    if(dirty&&!window.confirm('Discard unsaved edits and reload saved profiles?'))return;
    const next=readProfiles();setStore(next.store);setWritable(next.writable);setNotice(next.notice||'Saved profiles reloaded.');setDraft(next.store.profiles.find(p=>p.id===next.store.activeIds[model])??blank(model));setDirty(false);
  }
  return <details className="border rounded-lg p-4 mb-5">
    <summary className="font-semibold cursor-pointer">Aircraft configuration {active?`· ${active.name}`:'· no profile selected'}</summary>
    <p className="text-sm text-slate-600 my-3">Saved on this browser and device; no sign-in or upload. Clearing browser storage removes profiles. Serial numbers and modification details are user reported. Blank fields mean unknown.</p>
    <label className="block text-sm mb-3">Use a saved {model} profile<select aria-label="Saved aircraft profile" value={active?.id??''} disabled={!writable} onChange={e=>choose(e.target.value)} className="block border rounded p-2 w-full mt-1"><option value="">Browse without a profile</option>{store.profiles.filter(p=>p.model===model).map(p=><option key={p.id} value={p.id}>{p.name} · {p.serial||'serial unknown'}</option>)}</select></label>
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="text-sm">Profile name<input aria-label="Aircraft profile name" maxLength={80} value={draft.name} onChange={e=>edit({...draft,name:e.target.value})} className="block border rounded p-2 w-full mt-1"/></label>
      <label className="text-sm">Serial number (optional)<input aria-label="Aircraft serial number" maxLength={32} value={draft.serial} onChange={e=>edit({...draft,serial:e.target.value})} placeholder="Manufacturer serial; blank if unknown" className="block border rounded p-2 w-full mt-1"/></label>
    </div>
    <h3 className="font-semibold text-sm mt-4">STCs and modifications</h3><p className="text-xs text-slate-600 mt-1 mb-3">Enter certificate numbers from aircraft records. Approval for this model does not establish installation. Unlisted STCs have unknown installation status.</p>
    <div className="space-y-3">{draft.modifications.map((mod,index)=><div key={index} className="border rounded p-3 space-y-2">
      <div className="grid sm:grid-cols-2 gap-2"><label className="text-sm">STC number<input aria-label={`STC number ${index+1}`} value={mod.number} maxLength={60} onChange={e=>edit({...draft,modifications:draft.modifications.map((m,i)=>i===index?{...m,number:e.target.value}:m)})} className="block border rounded p-2 w-full mt-1"/></label>
      <label className="text-sm">Installation status<select aria-label={`STC installation ${index+1}`} value={mod.status} onChange={e=>edit({...draft,modifications:draft.modifications.map((m,i)=>i===index?{...m,status:e.target.value as InstallationStatus}:m)})} className="block border rounded p-2 w-full mt-1"><option value="unknown">Unknown</option><option value="installed">Installed — user reported</option><option value="not_installed">Not installed — user reported</option></select></label></div>
      <label className="block text-sm">Record reference or note (optional)<input aria-label={`STC record note ${index+1}`} maxLength={300} value={mod.note} onChange={e=>edit({...draft,modifications:draft.modifications.map((m,i)=>i===index?{...m,note:e.target.value}:m)})} className="block border rounded p-2 w-full mt-1"/></label>
      <button className="text-sm text-red-700 underline" onClick={()=>edit({...draft,modifications:draft.modifications.filter((_,i)=>i!==index)})}>Remove entry {index+1}</button>
    </div>)}</div>
    <button disabled={draft.modifications.length>=50} onClick={()=>edit({...draft,modifications:[...draft.modifications,{number:'',status:'unknown',note:''}]})} className="text-sm text-blue-700 underline mt-3">Add STC entry</button>
    {!!equipmentOptions.length&&<><h3 className="font-semibold text-sm mt-5">Installed equipment</h3><p className="text-xs text-slate-600 mt-1 mb-3">Choose only reviewed equipment families shown in the graph. A reported installation narrows relevance; exact part, software, serial and completed actions still require aircraft-record review.</p>
    <div className="space-y-3">{(draft.equipment??[]).map((item,index)=><div key={index} className="border rounded p-3 space-y-2">
      <div className="grid sm:grid-cols-2 gap-2"><label className="text-sm">Equipment<select aria-label={`Equipment item ${index+1}`} value={item.key} onChange={e=>edit({...draft,equipment:(draft.equipment??[]).map((entry,i)=>i===index?{...entry,key:e.target.value}:entry)})} className="block border rounded p-2 w-full mt-1"><option value="">Select reviewed equipment</option>{equipmentOptions.map(option=><option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
      <label className="text-sm">Installation status<select aria-label={`Equipment installation ${index+1}`} value={item.status} onChange={e=>edit({...draft,equipment:(draft.equipment??[]).map((entry,i)=>i===index?{...entry,status:e.target.value as InstallationStatus}:entry)})} className="block border rounded p-2 w-full mt-1"><option value="unknown">Unknown</option><option value="installed">Installed — user reported</option><option value="not_installed">Not installed — user reported</option></select></label></div>
      <label className="block text-sm">Record reference or note (optional)<input aria-label={`Equipment record note ${index+1}`} maxLength={300} value={item.note} onChange={e=>edit({...draft,equipment:(draft.equipment??[]).map((entry,i)=>i===index?{...entry,note:e.target.value}:entry)})} className="block border rounded p-2 w-full mt-1"/></label>
      <button className="text-sm text-red-700 underline" onClick={()=>edit({...draft,equipment:(draft.equipment??[]).filter((_,i)=>i!==index)})}>Remove equipment {index+1}</button>
    </div>)}</div>
    <button disabled={(draft.equipment??[]).length>=50} onClick={()=>edit({...draft,equipment:[...(draft.equipment??[]),{key:'',status:'unknown',note:''}]})} className="text-sm text-blue-700 underline mt-3">Add equipment entry</button></>}
    <div className="flex flex-wrap gap-3 mt-4"><button disabled={!writable} onClick={save} className="bg-blue-600 text-white rounded px-3 py-2 disabled:opacity-50">Save and use profile</button><button onClick={()=>{if(!dirty||window.confirm('Discard unsaved profile edits?')){setDraft(blank(model));setDirty(false);setNotice('New draft. Save it to use it for relevance checks.');}}} className="border rounded px-3 py-2">New profile</button>
      {store.profiles.some(p=>p.id===draft.id)&&<button onClick={remove} className="text-red-700 text-sm underline">Delete saved profile</button>}
      {!!store.profiles.length&&<button onClick={exportProfiles} className="text-blue-700 text-sm underline">Export profiles</button>}
      <button onClick={reloadProfiles} className="text-blue-700 text-sm underline">Reload saved profiles</button>
      {!writable&&<button onClick={reset} className="text-red-700 text-sm underline">Reset aircraft profile storage</button>}
    </div>
    {dirty&&<p className="text-xs text-amber-900 mt-2">Unsaved edits. Relevance uses the selected saved profile until you save.</p>}
    {active&&<p className="text-xs text-slate-600 mt-2">Using {active.name} · serial {active.serial||'unknown'} · saved {new Date(active.updatedAt).toLocaleString()}</p>}
    {notice&&<p role="status" className="text-sm text-amber-900 mt-3">{notice}</p>}
  </details>;
}
