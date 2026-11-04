import {useSyncExternalStore} from 'react';
import {browserRecordFailures,browserRecordSubscription} from '../lib/browserRecords';
export default function BrowserStorageNotice(){
 const failed=useSyncExternalStore(browserRecordSubscription,browserRecordFailures,()=> '');
 if(!failed)return null;
 return <div role="status" className="mx-auto max-w-7xl rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p>Some personal browser records could not be read or saved. Existing data was preserved. Shared FAA sources remain available.</p><p className="mt-1">Check that browser storage is allowed, then reload. Unreadable personal records will stay unavailable until recovered.</p><button className="mt-2 text-blue-800 underline" onClick={()=>window.location.reload()}>Reload page</button></div>;
}
