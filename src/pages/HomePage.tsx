import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalog } from '../lib/catalog';
import type { CatalogDocument, CatalogSource } from '../domain/catalog';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [documents, setDocuments] = useState<CatalogDocument[]>([]);
  const [source, setSource] = useState<CatalogSource>('sample');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void catalog.list().then(result => {
      if (cancelled) return;
      setDocuments(result.data);
      setSource(result.source);
      setNotice(result.notice ?? '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/tcds/${encodeURIComponent(search.trim().toUpperCase())}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Aircraft Regulatory Explorer
          </h1>
          <p className="text-gray-600">
            Explore aircraft certification data and its sources.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              aria-label="TCDS number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter TCDS number (e.g., 2A13)..."
              className="border rounded px-4 py-3 min-w-0 flex-1 text-lg"
            />
            <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded text-lg font-medium">
              Search
            </button>
          </div>
        </form>
        <div className="text-left space-y-3">
          <h2 className="font-semibold text-gray-900">{source === 'database' ? 'Shared FAA catalog' : 'Verified FAA demo snapshots'}</h2>
          {loading && <p role="status" className="text-gray-600">Loading catalog...</p>}
          {notice && <p role="status" className="text-amber-900">{notice}</p>}
          {!loading && documents.length === 0 && <p className="text-gray-600">No published TCDS records are available yet.</p>}
          {documents.map(sample => (
            <Link key={sample.tcds_number} to={`/tcds/${sample.tcds_number}`} className="block rounded border bg-white p-4 hover:border-blue-500">
              <span className="font-semibold text-blue-700">{sample.tcds_number}</span>
              <span className="ml-2 text-sm text-gray-600">{sample.product_type} · {sample.holder}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
