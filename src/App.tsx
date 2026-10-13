import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TCDSDetail from './pages/TCDSDetail';
import ChangeLogPage from './pages/ChangeLogPage';

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
          Prototype: FAA catalog browsing and local history. Automatic updates are not enabled yet.
        </p>

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tcds/:tcdsNumber" element={<TCDSDetail />} />
          <Route path="/changelog" element={<ChangeLogPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
