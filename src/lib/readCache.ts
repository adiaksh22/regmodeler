// Short-lived, bounded memory cache. Failed and superseded reads never become
// cached successes; simultaneous consumers share the same request.
export function createReadCache({ttlMs=120_000,maxEntries=32,now=Date.now}={}) {
 type Entry={promise:Promise<unknown>;expires:number;settled:boolean};
 const entries=new Map<string,Entry>();
 return {
  read<T>(key:string,load:()=>Promise<T>):Promise<T>{
   const found=entries.get(key);
   if(found&&(!found.settled||found.expires>now())){
    entries.delete(key);entries.set(key,found);return found.promise as Promise<T>;
   }
   entries.delete(key);
   const entry:Entry={promise:Promise.resolve(),expires:0,settled:false};
   entry.promise=Promise.resolve().then(load).then(value=>{
    entry.settled=true;entry.expires=now()+ttlMs;return value;
   },error=>{if(entries.get(key)===entry)entries.delete(key);throw error;});
   entries.set(key,entry);
   while(entries.size>maxEntries)entries.delete(entries.keys().next().value!);
   return entry.promise as Promise<T>;
  },
  invalidate(prefix=''){for(const key of entries.keys())if(key.startsWith(prefix))entries.delete(key);},
 };
}
