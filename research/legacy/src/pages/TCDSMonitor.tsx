import { useState, useEffect } from 'react';
import TCDSChangeLogTable from '../components/TCDSChangeLogTable';
import { TCDSChangeLog } from '../types/tcds';
import { getChangeLogs } from '../utils/changeLogManager';
import { startBackgroundJob } from '../utils/tcdsBackgroundJob';

export default function TCDSMonitor() {
  const [logs, setLogs] = useState<TCDSChangeLog[]>([]);

  useEffect(() => {
    setLogs(getChangeLogs());
    
    const tcdsUrls = [
      { id: 'A00001SE', url: 'https://example.com/tcds/A00001SE' },
    ];
    
    const jobId = startBackgroundJob(tcdsUrls, 3600000);
    
    const interval = setInterval(() => {
      setLogs(getChangeLogs());
    }, 5000);

    return () => {
      clearInterval(jobId);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">TCDS Change Monitor</h1>
      <TCDSChangeLogTable data={logs} />
    </div>
  );
}
