import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { catalog } from '../lib/catalog';
import type { CatalogDocument, CatalogSource } from '../domain/catalog';

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<CatalogDocument[]>([]);
  const [source, setSource] = useState<CatalogSource>('sample');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void catalog.list(query).then(result => {
      if (cancelled) return;
      setDocuments(result.data);setSource(result.source);setNotice(result.notice ?? '');setLoading(false);
    });
    return () => { cancelled = true; };
  }, [query]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    if (!search.trim()) { setQuery(''); return; }
    const number=search.trim().toUpperCase();
    if(documents.some(doc=>doc.tcds_number===number)) navigate(`/tcds/${encodeURIComponent(number)}`);
    else setQuery(search.trim());
  };

  return <div className="container mx-auto px-4 py-8 lg:py-12"><div className="mx-auto max-w-6xl">
    <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 lg:py-14"><div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-600/30 blur-3xl"/><div className="relative max-w-3xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-blue-300">Traceable aviation data</p><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Navigate aircraft rules as connected evidence.</h1><p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">Start with an aircraft model, then follow its type certificate, regulations, airworthiness directives, components, and cited source pages.</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Official FAA records</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Page-cited relationships</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Browser-private profiles</span></div></div></section>

    <form onSubmit={handleSearch} className="relative z-10 mx-auto -mt-5 mb-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
      <label htmlFor="catalog-search" className="mb-2 block text-sm font-bold text-slate-900">Find an aircraft model or type certificate</label><div className="flex flex-col gap-2 sm:flex-row"><input id="catalog-search" type="text" aria-label="Aircraft model or TCDS number" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Aircraft model, e.g. 737-8" maxLength={200} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-lg shadow-inner"/><button type="submit" className="rounded-xl bg-blue-700 px-8 py-3 text-lg font-bold text-white shadow-sm hover:bg-blue-800">Search</button></div><p className="mt-2 text-xs text-slate-500">Try “737-8”, “PA-28-181”, “A16WE”, or “2A13”.</p>
    </form>

    <section aria-labelledby="aircraft-library-title"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Aircraft library</p><h2 id="aircraft-library-title" className="text-2xl font-bold text-slate-950">{source==='database'?'Shared FAA catalog':'Verified FAA snapshots'}</h2></div><span className="text-sm text-slate-500">Model-first discovery</span></div>
      {loading&&<p role="status" className="text-slate-600">Loading catalog…</p>}{notice&&<p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}{!loading&&documents.length===0&&<p className="text-slate-600">{query?'No catalog matches. Try another model or certificate number.':'No published TCDS records are available yet.'}</p>}{!loading&&query&&<button onClick={()=>{setSearch('');setQuery('');}} className="mb-4 text-sm font-semibold text-blue-700 underline">Clear search</button>}
      <div className="grid gap-4 md:grid-cols-2">{!loading&&documents.map(document=><CatalogCard key={document.tcds_number} document={document} query={query}/>)}</div>
    </section>
  </div></div>;
}

function CatalogCard({document,query}:{document:CatalogDocument;query:string}){
 const exactModel=document.model.split('|').some(model=>model.trim().toUpperCase()===query.toUpperCase());
 const title=document.tcds_number==='2A13'?'Piper PA-28 family':document.tcds_number==='A16WE'?'Boeing 737 family':document.holder;
 return <Link to={`/tcds/${document.tcds_number}${exactModel?`?model=${encodeURIComponent(query.toUpperCase())}`:''}`} className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"><span className="text-xs font-bold uppercase tracking-wide text-blue-700">TCDS {document.tcds_number}</span><span className="float-right rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Revision {document.revision}</span><h3 className="mt-2 text-lg font-bold text-slate-950 group-hover:text-blue-800">{title}</h3><p className="mt-1 text-sm text-slate-600">{document.product_type} · {document.holder}</p><p className="mt-3 text-sm text-slate-500">{document.model.split('|').slice(0,3).join(' · ')}{document.model.split('|').length>3?' · more models':''}</p></Link>;
}
