import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import { readWorkerConfig } from './check.mjs';
import { collectTcds, drsClient, ImportError, metadataFingerprint, snapshot } from './drs.mjs';

export async function importPa28(client, source, { verifyOnly = false, now = () => new Date().toISOString() } = {}) {
  let runId;
  try {
    if (!verifyOnly) {
      const run = await client.from('ingestion_runs').insert({ source: 'FAA:TCDSMODEL:2A13', status: 'running' }).select('id').single();
      if (run.error) throw new ImportError('RUN_START_FAILED');
      runId = run.data.id;
    }
    // Fully reconcile this small catalog; independently validate incremental filtering.
    const records = await collectTcds(source);
    if (records.filter(r=>r['drs:status']==='Current').length !== 1) throw new ImportError('CURRENT_REVISION_AMBIGUOUS');
    const newest = Math.max(...records.map(r=>Date.parse(r.docLastModifiedDate)));
    const since = new Date(newest - 86400000).toISOString();
    const incremental = await collectTcds(source, since);
    const expected = records.filter(r=>Date.parse(r.docLastModifiedDate)>Date.parse(since)).map(r=>r.documentURL).sort();
    if (JSON.stringify(incremental.map(r=>r.documentURL).sort()) !== JSON.stringify(expected)) throw new ImportError('INCREMENTAL_RECONCILIATION_MISMATCH');
    const originals = new Map(records.map(r=>[r.documentURL,metadataFingerprint(r)]));
    if (incremental.some(r=>metadataFingerprint(r)!==originals.get(r.documentURL))) throw new ImportError('CATALOG_CHANGED_DURING_VERIFICATION');
    if (verifyOnly) return { mode: 'source-verification', certificate: '2A13', revisions: records.length, positiveIncrementalRecords: incremental.length };
    const retrievedAt = now(); const batch = [];
    for (const record of records) {
      const bytes = await source.pdf(record.mainDocumentDownloadURL);
      const item = snapshot(record, bytes, retrievedAt);
      for (const [path, content, contentType] of [
        [item.storage_path, bytes, 'application/pdf'],
        [item.metadata.metadata_storage_path, item.metadataBytes, 'application/json'],
      ]) {
        const stored = await client.storage.from('regulatory-sources').upload(path, content, { contentType, upsert: false });
        if (stored.error && String(stored.error.statusCode) !== '409' && stored.error.error !== 'Duplicate') throw new ImportError('SOURCE_ARCHIVE_FAILED');
        if (stored.error) {
          const existing = await client.storage.from('regulatory-sources').download(path);
          if (existing.error || !Buffer.from(await existing.data.arrayBuffer()).equals(content)) throw new ImportError('SOURCE_ARCHIVE_MISMATCH');
        }
      }
      const { metadataBytes: _bytes, ...row } = item;
      batch.push(row);
    }
    const committed = await client.rpc('commit_pa28_tcds', { p_run_id: runId, p_records: batch });
    if (committed.error) throw new ImportError('BATCH_COMMIT_FAILED');
    return { mode: 'import', certificate: '2A13', revisions: committed.data, positiveIncrementalRecords: incremental.length, retrievedAt };
  } catch (error) {
    const code = error instanceof ImportError ? error.code : 'IMPORT_FAILED';
    if (runId) await client.from('ingestion_runs').update({ status: 'failed', completed_at: now(), error_code: code }).eq('id', runId).eq('status','running');
    throw new ImportError(code);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const verifyOnly = process.argv.includes('--verify-only');
    const source = drsClient(process.env.FAA_DRS_API_KEY);
    const config = verifyOnly ? null : readWorkerConfig(process.env);
    const client = config ? createClient(config.url, config.secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(45000) }) },
    }) : null;
    console.log(JSON.stringify(await importPa28(client, source, { verifyOnly })));
  } catch (error) {
    console.error(JSON.stringify({ status: 'failed', code: error instanceof ImportError ? error.code : 'IMPORT_FAILED' }));
    process.exitCode = 1;
  }
}
