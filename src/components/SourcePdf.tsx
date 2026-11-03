import {useEffect,useRef,useState} from 'react';
import {getOriginalLink} from '../lib/relatedCatalog';
export default function SourcePdf({versionId,attachmentId,page=1,label='View cited PDF'}:{versionId:string;attachmentId?:string;page?:number;label?:string}) {
  const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const trigger=useRef<HTMLButtonElement>(null);const close=useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const dismiss=()=>{dialog.current?.close();setUrl('');trigger.current?.focus();};
  useEffect(()=>{
    if(!url||!dialog.current)return;
    const modal=dialog.current;
    const previousOverflow=document.body.style.overflow;
    modal.showModal();close.current?.focus();document.body.style.overflow='hidden';
    return()=>{if(modal.open)modal.close();document.body.style.overflow=previousOverflow;};
  },[url]);
  async function open(){setBusy(true);setError('');try{setUrl(await getOriginalLink(versionId,attachmentId));}catch{setError('The archived PDF is unavailable. Use the official source link.');}finally{setBusy(false);}}
  return <>
    <button ref={trigger} onClick={()=>void open()} disabled={busy} className="border border-blue-600 rounded px-3 py-2 text-blue-800 text-sm mt-3 disabled:opacity-50">{busy?'Loading PDF…':label}</button>
    {error&&<p role="status" className="text-sm text-amber-900 mt-2">{error}</p>}
    {url&&<dialog ref={dialog} role="dialog" aria-modal="true" aria-label="Archived source PDF" onCancel={event=>{event.preventDefault();dismiss();}} onClose={()=>{setUrl('');trigger.current?.focus();}} className="fixed inset-0 m-auto w-[calc(100%_-_1.5rem)] max-w-6xl h-[90dvh] max-h-[calc(100dvh_-_1.5rem)] rounded-xl border border-slate-300 bg-white p-0 shadow-2xl backdrop:bg-slate-950/60">
      <div className="h-full flex flex-col overflow-hidden">
        <div className="p-3 flex flex-wrap justify-between gap-3 border-b"><strong>Archived source · page {page}</strong><div className="flex gap-4"><a href={`${url}#page=${page}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Open in new tab</a><button ref={close} onClick={dismiss} aria-label="Close PDF" className="font-semibold">Close</button></div></div>
        <iframe title="Archived source PDF" src={`${url}#page=${page}`} referrerPolicy="no-referrer" className="w-full flex-1 border-0"/>
      </div>
    </dialog>}
  </>;
}
