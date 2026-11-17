import {profileModels,type AircraftProfile} from '../domain/aircraftProfile';
export const DRAFT_PREFIX='regmodeler_profile_draft_v1:';
export type ProfileDraft={schemaVersion:1;profile:AircraftProfile;baseFingerprint:string;};
const memory=new Map<string,ProfileDraft>();
const volatile=new Set<string>();
const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
function markVolatile(model:string,unsaved:boolean){
 if(unsaved)volatile.add(model);else volatile.delete(model);
 if(typeof window!=='undefined'){
  window.removeEventListener('beforeunload',guard);
  if(volatile.size)window.addEventListener('beforeunload',guard);
 }
}
const supported=(model:string)=>profileModels.includes(model as typeof profileModels[number]);
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=(value:unknown,max:number)=>typeof value==='string'&&value.length<=max;
function valid(value:unknown,model:string):value is ProfileDraft {
 if(!object(value)||value.schemaVersion!==1||!text(value.baseFingerprint,1_000_000)||!object(value.profile))return false;
 const p=value.profile;
 if(!supported(model)||p.model!==model||typeof p.id!=='string'||!/^[\w-]{1,80}$/.test(p.id)||!text(p.name,80)||!text(p.serial,32)||typeof p.updatedAt!=='string'||!Number.isFinite(Date.parse(p.updatedAt)))return false;
 if(!Array.isArray(p.modifications)||p.modifications.length>50||p.modifications.some(m=>!object(m)||!text(m.number,60)||!text(m.note,300)||!['installed','not_installed','unknown'].includes(String(m.status))))return false;
 if(!Array.isArray(p.equipment)||p.equipment.length>50||p.equipment.some(e=>!object(e)||!text(e.key,120)||!text(e.note,300)||!['installed','not_installed','unknown'].includes(String(e.status))))return false;
 return true;
}
function stored(model:string):ProfileDraft|null {
 const raw=sessionStorage.getItem(DRAFT_PREFIX+model);if(raw===null)return null;
 if(raw.length>1_100_000)throw Error('Draft too large');
 const value:unknown=JSON.parse(raw);if(!valid(value,model))throw Error('Invalid draft');
 return value;
}
export function readProfileDraft(model:string):{record:ProfileDraft|null;backedUp:boolean;writable:boolean}{
 try{
  const saved=stored(model),record=memory.get(model)??saved;
  const backedUp=!!record&&JSON.stringify(saved)===JSON.stringify(record);markVolatile(model,!!record&&!backedUp);
  return {record,backedUp,writable:true};
 }catch{markVolatile(model,memory.has(model));return {record:memory.get(model)??null,backedUp:false,writable:false};}
}
export function writeProfileDraft(record:ProfileDraft):boolean {
 const model=record.profile.model;if(!valid(record,model))return false;
 // Keep route navigation recoverable even if the tab's storage is full/blocked.
 const copy=JSON.parse(JSON.stringify(record)) as ProfileDraft;memory.set(model,copy);
 try{stored(model);const raw=JSON.stringify(copy);if(raw.length>1_100_000)throw Error('Draft too large');sessionStorage.setItem(DRAFT_PREFIX+model,raw);markVolatile(model,false);return true;}catch{markVolatile(model,true);return false;}
}
export function clearProfileDraft(model:string,resetUnreadable=false):boolean {
 try{if(!resetUnreadable)stored(model);sessionStorage.removeItem(DRAFT_PREFIX+model);memory.delete(model);markVolatile(model,false);return true;}catch{return false;}
}
