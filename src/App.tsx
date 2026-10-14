import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {lazy,Suspense} from 'react';
import HomePage from './pages/HomePage';
const TCDSDetail=lazy(()=>import('./pages/TCDSDetail'));
const ChangeLogPage=lazy(()=>import('./pages/ChangeLogPage'));

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow mb-6">
          <div className="container mx-auto px-4 py-4 flex gap-6">
            <Link to="/" className="text-blue-600 hover:underline">RegModeler</Link>
            <Link to="/changelog" className="text-blue-600 hover:underline">Change Log</Link>
          </div>
        </nav>
        <p className="container mx-auto px-4 mb-4 text-sm text-amber-900" role="note">
          Prototype: daily FAA source checks for PA-28-140 and PA-28-181, with imported revisions and reviewed relationship evidence.
        </p>

        <Suspense fallback={<p role="status" className="p-6">Loading page…</p>}><Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tcds/:tcdsNumber" element={<TCDSDetail />} />
          <Route path="/changelog" element={<ChangeLogPage />} />
        </Routes></Suspense>
      </div>
    </BrowserRouter>
  );
}

export default App;
