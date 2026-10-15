import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {lazy,Suspense} from 'react';
import HomePage from './pages/HomePage';
const TCDSDetail=lazy(()=>import('./pages/TCDSDetail'));
const ChangeLogPage=lazy(()=>import('./pages/ChangeLogPage'));

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-100">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2">Skip to content</a>
        <nav className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" aria-label="Primary navigation">
          <div className="container mx-auto flex items-center justify-between gap-6 px-4 py-3">
            <Link to="/" className="flex items-center gap-3 text-slate-950"><span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-lg bg-blue-700 text-sm font-black text-white">RM</span><span><span className="block font-bold leading-tight">RegModeler</span><span className="block text-[10px] uppercase tracking-[.14em] text-slate-500">FAA evidence explorer</span></span></Link>
            <div className="flex items-center gap-5 text-sm font-semibold"><Link to="/" className="text-slate-700 hover:text-blue-700">Explore</Link><Link to="/changelog" className="text-slate-700 hover:text-blue-700">Source changes</Link></div>
          </div>
        </nav>
        <div className="border-b border-amber-200 bg-amber-50" role="note"><p className="container mx-auto px-4 py-2 text-xs text-amber-950"><strong>Research prototype.</strong> Reviewed FAA evidence helps locate records; it does not determine individual-aircraft applicability or compliance.</p></div>
        <main id="main-content"><Suspense fallback={<p role="status" className="p-6">Loading page…</p>}><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tcds/:tcdsNumber" element={<TCDSDetail />} />
          <Route path="/changelog" element={<ChangeLogPage />} />
        </Routes></Suspense></main>
      </div>
    </BrowserRouter>
  );
}

export default App;
