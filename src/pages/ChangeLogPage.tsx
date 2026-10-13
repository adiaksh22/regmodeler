import { useState, useEffect } from 'react';
import ChangeLogEntriesTable from '../components/ChangeLogEntriesTable';
import IssuesTable from '../components/IssuesTable';
import { TCDSChangeLogEntry, Issue } from '../types/tcds';
import { getChangeLogEntries, getIssues } from '../utils/storageManager';
import { getIssuesOverTime, getCurrentIssueStats } from '../utils/issuesAnalytics';

export default function ChangeLogPage() {
  const [entries, setEntries] = useState<TCDSChangeLogEntry[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getCurrentIssueStats> | null>(null);
  const [intervals, setIntervals] = useState<ReturnType<typeof getIssuesOverTime>>([]);

  const refresh = () => {
    setEntries(getChangeLogEntries());
    setIssues(getIssues());
    setStats(getCurrentIssueStats());
    setIntervals(getIssuesOverTime('day', 30));
  };

  useEffect(() => {
    refresh();

  }, []);

  return (
    <div className="p-6 space-y-8">
      <p className="text-sm text-gray-600">Local prototype records. Aircraft monitoring and notifications will be connected during ingestion.</p>
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Issue Statistics</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Open</p>
              <p className="text-2xl font-bold text-red-600">{stats.open}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ignored</p>
              <p className="text-2xl font-bold text-gray-400">{stats.ignored}</p>
            </div>
          </div>

          {intervals.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Last 30 Days</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600">Date</th>
                      <th className="px-3 py-2 text-left text-gray-600">Opened</th>
                      <th className="px-3 py-2 text-left text-gray-600">Resolved</th>
                      <th className="px-3 py-2 text-left text-gray-600">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intervals.slice(-7).map((int, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 text-gray-900">{int.intervalStart}</td>
                        <td className="px-3 py-2 text-red-600">{int.openedCount}</td>
                        <td className="px-3 py-2 text-green-600">{int.resolvedCount}</td>
                        <td className="px-3 py-2 text-gray-900 font-semibold">{int.activeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900">TCDS Change Log</h1>
        <ChangeLogEntriesTable data={entries} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Issues</h2>
        <IssuesTable data={issues} onUpdate={refresh} />
      </div>
    </div>
  );
}
