import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TCDSRevision } from '../types/revision';
import { catalog, loadExplorerDetails } from '../lib/catalog';
import type { ExplorerDetails } from '../domain/explorer';
import AircraftExplorer from '../components/AircraftExplorer';
import type { CatalogDocument } from '../domain/catalog';
import { getRevisionsByTCDS } from '../utils/revisionManager';
import { getGroupByMember, createGroup, addToGroup } from '../utils/crossReferenceManager';
import type { CrossRefGroup } from '../types/crossReference';
import RevisionHistory from '../components/RevisionHistory';

export default function TCDSDetail() {
  const { tcdsNumber } = useParams<{ tcdsNumber: string }>();
  const [doc, setDoc] = useState<CatalogDocument | null>(null);
  const [notice, setNotice] = useState('');
  const [revisions, setRevisions] = useState<TCDSRevision[]>([]);
  const [crossRefGroup, setCrossRefGroup] = useState<CrossRefGroup | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [details, setDetails] = useState<ExplorerDetails>({revisions:[],relationships:[],lastChecked:null,available:false});

  useEffect(() => {
    let cancelled = false;
    if (tcdsNumber) {
      setDoc(null);
      setNotice('');
      setLoading(true);
      setDetails({revisions:[],relationships:[],lastChecked:null,available:false,notice:'Loading imported aircraft data...'});
      void loadExplorerDetails(tcdsNumber).then(result=>{if(!cancelled) setDetails(result);});
      void catalog.get(tcdsNumber).then(result => {
        if (cancelled) return;
        setDoc(result.data);
        setNotice(result.notice ?? '');
        setLoading(false);
      });
      setRevisions(getRevisionsByTCDS(tcdsNumber));
      setCrossRefGroup(getGroupByMember(tcdsNumber));
    }
    return () => { cancelled = true; };
  }, [tcdsNumber, reload]);

  const handleRefresh = () => {
    setReload(value => value + 1);
  };

  const handleLinkTCDS = () => {
    if (!linkInput.trim() || !tcdsNumber) return;

    const normalized = linkInput.trim().toUpperCase();

    if (crossRefGroup) {
      addToGroup(crossRefGroup.group_id, normalized);
    } else {
      createGroup([tcdsNumber.toUpperCase(), normalized], 'manual');
    }

    setCrossRefGroup(getGroupByMember(tcdsNumber));
    setLinkInput('');

  };

  if (!tcdsNumber) return null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">TCDS: {tcdsNumber?.toUpperCase()}</h1>
        <button
          onClick={handleRefresh}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Reload catalog
        </button>
      </div>

      {loading && <p className="text-gray-500">Loading document information...</p>}
      {notice && <p role="status" className="text-amber-900 mb-4">{notice}</p>}

      {!loading && !doc && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-semibold">TCDS not included in this catalog</p>
          <p className="text-yellow-700 mt-2">Search the FAA DRS source catalog or return to aircraft search.</p>
          <a href="https://drs.faa.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">Search FAA DRS</a>
        </div>
      )}

      {doc && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            FAA snapshot retrieved {new Date(doc.retrieved_at).toLocaleDateString()}. Source status reflects that retrieval.
          </p>
          <div className="bg-white rounded-lg shadow p-6 space-y-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Covered models</label>
                <p className="text-lg text-gray-900">{doc.product_type==='Aircraft'?`${doc.model.split('|').length} models · select a model below`:doc.model}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Status</label>
                <p className="text-lg text-gray-900 capitalize">{doc.status}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Revision</label>
                <p className="text-lg text-gray-900">{doc.revision}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Revision Date</label>
                <p className="text-lg text-gray-900">{doc.revision_date}</p>
              </div>
              {doc.holder && (
                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold text-gray-600">Type Certificate Holder</label>
                  <p className="text-lg text-gray-900">{doc.holder}</p>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold text-gray-600">Document URL</label>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block break-all">
                  Open FAA source document
                </a>
              </div>
            </div>
          </div>

          {doc.product_type==='Aircraft' && <AircraftExplorer doc={doc} details={details} />}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cross-References</h2>
            <p className="text-sm text-gray-600 mb-3">Personal links stored in this browser. These links do not establish regulatory applicability.</p>
            {crossRefGroup ? (
              <div>
                <p className="text-sm text-gray-600 mb-2">Linked TCDS:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {crossRefGroup.members.filter((m: string) => m !== tcdsNumber?.toUpperCase()).map((member: string) => (
                    <span key={member} className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                      {member}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-4">No cross-references yet.</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Enter TCDS number to link..."
                aria-label="TCDS number to link"
                className="border rounded px-3 py-2 flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleLinkTCDS()}
              />
              <button
                onClick={handleLinkTCDS}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Link
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Browser-recorded prototype history</h2>
            <p className="text-sm text-gray-600 mb-3">Personal snapshots saved in this browser.</p>
            <RevisionHistory revisions={revisions} />
          </div>
        </>
      )}
    </div>
  );
}
