// auth-js reads its lock-debug flag during module initialization after testing
// only storage writes. Normalize read-denied storage to the browser's standard
// inaccessible-storage behavior before evaluating that dependency. Never clear
// records or replace them with an apparently writable empty store.
export function guardBrowserStorage(target:{readonly localStorage:Pick<Storage,'getItem'>}):void {
 try{target.localStorage.getItem('regmodeler_storage_access_probe');}
 catch{
  try{Object.defineProperty(target,'localStorage',{configurable:true,get(){throw new DOMException('Browser storage is unavailable.','SecurityError');}});}
  catch{/* A browser-enforced non-configurable denial already remains in effect. */}
 }
}
if(typeof window!=='undefined')guardBrowserStorage(window);
