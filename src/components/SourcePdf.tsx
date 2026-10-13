import {useEffect,useRef,useState} from 'react';
import {getOriginalLink} from '../lib/relatedCatalog';
export default function SourcePdf({versionId,page=1,label='View cited PDF'}:{versionId:string;page?:number;label?:string}) {
  const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const trigger=useRef<HTMLButtonElement>(null);const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!url)return;close.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setUrl('');trigger.current?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[url]);
  async function open(){setBusy(true);setError('');try{setUrl(await getOriginalLink(versionId));}catch{setError('The archived PDF is unavailable. Use the official source link.');}finally{setBusy(false);}}
  return <>
    <button ref={trigger} onClick={()=>void open()} disabled={busy} className="border border-blue-600 rounded px-3 py-2 text-blue-800 text-sm mt-3 disabled:opacity-50">{busy?'Loading PDF…':label}</button>
    {error&&<p role="status" className="text-sm text-amber-900 mt-2">{error}</p>}
    {url&&<div role="dialog" aria-modal="true" aria-label="Archived source PDF" className="fixed inset-0 z-50 bg-slate-950/60 p-3 sm:p-6 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="p-3 flex flex-wrap justify-between gap-3 border-b"><strong>Archived source · page {page}</strong><div className="flex gap-4"><a href={`${url}#page=${page}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Open in new tab</a><button ref={close} onClick={()=>{setUrl('');trigger.current?.focus();}} aria-label="Close PDF" className="font-semibold">Close</button></div></div>
        <iframe title="Archived source PDF" src={`${url}#page=${page}`} referrerPolicy="no-referrer" className="w-full flex-1 border-0"/>
      </div>
    </div>}
  </>;
}
