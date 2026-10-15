import {validateProfile, profileModels, type AircraftProfile} from '../domain/aircraftProfile';
export const PROFILE_KEY = 'regmodeler_aircraft_profiles_v1';
export type ProfileStore = {schemaVersion:1; profiles:AircraftProfile[]; activeIds:Record<string,string>;};
export const emptyProfiles = (): ProfileStore => ({schemaVersion:1,profiles:[],activeIds:{}});
export const profileStoreFingerprint = (store:ProfileStore):string => JSON.stringify({
  version:store.schemaVersion,
  profiles:[...store.profiles].sort((a,b)=>a.id.localeCompare(b.id)).map(p=>[p.id,p.model,p.name,p.serial,p.updatedAt,p.modifications.map(m=>[m.number,m.status,m.note]),(p.equipment??[]).map(e=>[e.key,e.status,e.note])]),
  activeIds:Object.entries(store.activeIds).sort(([a],[b])=>a.localeCompare(b)),
});
export function readProfiles(): {store:ProfileStore; writable:boolean; notice:string} {
  try {
    const raw = localStorage.getItem(PROFILE_KEY); if (!raw) return {store:emptyProfiles(),writable:true,notice:''};
    if (raw.length > 1_000_000) throw new Error();
    const value:unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('schemaVersion' in value) || value.schemaVersion !== 1 || !('profiles' in value) || !Array.isArray(value.profiles) || value.profiles.length > 100 || !('activeIds' in value) || !value.activeIds || typeof value.activeIds !== 'object' || Array.isArray(value.activeIds)) throw new Error();
    const ids = new Set<string>();
    for (const p of value.profiles) {
      if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !/^[\w-]{1,80}$/.test(p.id) || ids.has(p.id) || typeof p.model !== 'string' || typeof p.name !== 'string' || typeof p.serial !== 'string' || typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt)) || !Array.isArray(p.modifications) || p.modifications.some((m:unknown)=>!m || typeof m !== 'object' || !('number' in m) || typeof m.number !== 'string' || !('note' in m) || typeof m.note !== 'string') || ('equipment' in p&&(!Array.isArray(p.equipment)||p.equipment.some((e:unknown)=>!e||typeof e!=='object'||!('key' in e)||typeof e.key!=='string'||!('note' in e)||typeof e.note!=='string'))) || validateProfile(p)) throw new Error();
      ids.add(p.id);
    }
    for (const [model,id] of Object.entries(value.activeIds)) if (!profileModels.includes(model as typeof profileModels[number]) || typeof id !== 'string' || !value.profiles.some(p=>p.id===id && p.model===model)) throw new Error();
    // Copy only supported fields; browser data never becomes a source record.
    const store:ProfileStore = {schemaVersion:1,profiles:value.profiles.map(p=>({id:p.id,model:p.model,name:p.name,serial:p.serial,updatedAt:p.updatedAt,modifications:p.modifications.map((m:AircraftProfile['modifications'][number])=>({number:m.number,status:m.status,note:m.note})),equipment:(p.equipment??[]).map((e:NonNullable<AircraftProfile['equipment']>[number])=>({key:e.key,status:e.status,note:e.note}))})),activeIds:{...value.activeIds}};
    return {store,writable:true,notice:''};
  } catch {return {store:emptyProfiles(),writable:false,notice:'Saved profiles could not be read. Existing browser data has been preserved. Profiles cannot be saved until storage is available or the profile data is reset.'};}
}
export function writeProfiles(store:ProfileStore): boolean {
  try {const encoded=JSON.stringify(store);if(encoded.length>1_000_000)return false;localStorage.setItem(PROFILE_KEY,encoded);return true;} catch {return false;}
}
