// Recover personal prototype data without treating unreadable data as an empty,
// writable store. The raw value is preserved until the user repairs it.
const failures=new Map<string,string>();
const listeners=new Set<()=>void>();
let snapshot='';
function recordFailure(key:string,failed:boolean) {
 if(failed)failures.set(key,key);else failures.delete(key);
 const next=[...failures.keys()].sort().join(',');
 if(next===snapshot)return;
 snapshot=next;
 queueMicrotask(()=>listeners.forEach(listener=>listener()));
}
export const browserRecordSubscription=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const browserRecordFailures=()=>snapshot;
const maxBytes=2_000_000;
export const recordObject=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const stringFields=(value:unknown,fields:string[])=>recordObject(value)&&fields.every(field=>typeof value[field]==='string');

function parse(key:string,validate:(value:unknown)=>boolean):unknown {
 const raw=localStorage.getItem(key);
 if(raw===null)return undefined;
 if(raw.length>maxBytes)throw new Error();
 const value:unknown=JSON.parse(raw);
 if(!validate(value))throw new Error();
 return value;
}
export function readBrowserRecord<T>(key:string,fallback:T,validate:(value:unknown)=>boolean):T {
 try{const value=parse(key,validate);recordFailure(key,false);return value===undefined?fallback:value as T;}
 catch{recordFailure(key,true);return fallback;}
}
export function writeBrowserRecord(key:string,value:unknown,validate:(value:unknown)=>boolean):void {
 try{
  parse(key,validate); // Never overwrite an unreadable existing record.
  if(!validate(value))throw new Error();
  const raw=JSON.stringify(value);if(raw.length>maxBytes)throw new Error();
  localStorage.setItem(key,raw);recordFailure(key,false);
 }catch{recordFailure(key,true);throw new Error('Personal browser records could not be saved. Existing data was preserved.');}
}
