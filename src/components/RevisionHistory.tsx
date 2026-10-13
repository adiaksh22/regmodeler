import { TCDSRevision } from '../types/revision';

export default function RevisionHistory({ revisions }: { revisions: TCDSRevision[] }) {
  if (revisions.length === 0) {
    return <p className="text-gray-500">No revision history available.</p>;
  }

  return (
    <div className="space-y-3">
      {revisions.map((rev, idx) => (
        <div key={rev.id} className="border rounded p-4 bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="font-semibold text-gray-900">Revision {rev.revision}</span>
              <span className="text-gray-500 text-sm ml-2">{new Date(rev.timestamp).toLocaleString()}</span>
            </div>
            {idx === 0 && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Current</span>}
          </div>

          <div className="text-sm text-gray-700 space-y-1">
            <div><span className="font-medium">Date:</span> {rev.revision_date}</div>
            <div><span className="font-medium">Model:</span> {rev.model}</div>
            {rev.holder && <div><span className="font-medium">Holder:</span> {rev.holder}</div>}
          </div>

          {rev.field_changes && rev.field_changes.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm font-semibold text-gray-700 mb-2">Changes:</div>
              {rev.field_changes.map((change, i) => (
                <div key={i} className="text-sm bg-yellow-50 p-2 rounded mb-1">
                  <span className="font-medium capitalize">{change.field.replace('_', ' ')}:</span>
                  <span className="text-red-600 line-through ml-2">{change.old_value || 'none'}</span>
                  <span className="mx-1">→</span>
                  <span className="text-green-600">{change.new_value || 'none'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
