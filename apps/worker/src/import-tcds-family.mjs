import { createClient } from '@supabase/supabase-js'
import { pathToFileURL } from 'node:url'
import { readWorkerConfig } from './check.mjs'
import { collectTcds, drsClient, ImportError, metadataFingerprint, snapshot } from './drs.mjs'

export async function importTcdsFamily(client, source, certificate, { verifyOnly = false, now = () => new Date().toISOString() } = {}) {
  if (!/^[A-Z0-9-]{1,20}$/.test(certificate)) throw new ImportError('INVALID_CERTIFICATE')
  const sourceName = `FAA:TCDSMODEL:${certificate}`
  let runId
  try {
    if (!verifyOnly) {
      const run = await client.from('ingestion_runs').insert({ source: sourceName, status: 'running' }).select('id').single()
      if (run.error) throw new ImportError('RUN_START_FAILED')
      runId = run.data.id
    }
    const records = await collectTcds(source, undefined, certificate)
    if (records.filter((record) => record['drs:status'] === 'Current').length !== 1) throw new ImportError('CURRENT_REVISION_AMBIGUOUS')
    const newest = Math.max(...records.map((record) => Date.parse(record.docLastModifiedDate)))
    const since = new Date(newest - 86400000).toISOString()
    const incremental = await collectTcds(source, since, certificate)
    const expected = records.filter((record) => Date.parse(record.docLastModifiedDate) > Date.parse(since)).map((record) => record.documentURL).sort()
    if (JSON.stringify(incremental.map((record) => record.documentURL).sort()) !== JSON.stringify(expected)) throw new ImportError('INCREMENTAL_RECONCILIATION_MISMATCH')
    const originals = new Map(records.map((record) => [record.documentURL, metadataFingerprint(record)]))
    if (incremental.some((record) => metadataFingerprint(record) !== originals.get(record.documentURL))) throw new ImportError('CATALOG_CHANGED_DURING_VERIFICATION')
    if (verifyOnly) return { mode: 'source-verification', certificate, revisions: records.length, positiveIncrementalRecords: incremental.length }

    const retrievedAt = now()
    const batch = []
    for (const record of records) {
      const bytes = await source.pdf(record.mainDocumentDownloadURL)
      const item = snapshot(record, bytes, retrievedAt, certificate)
      for (const [path, content, contentType] of [
        [item.storage_path, bytes, 'application/pdf'],
        [item.metadata.metadata_storage_path, item.metadataBytes, 'application/json'],
      ]) {
        const stored = await client.storage.from('regulatory-sources').upload(path, content, { contentType, upsert: false })
        if (stored.error && String(stored.error.statusCode) !== '409' && stored.error.error !== 'Duplicate') throw new ImportError('SOURCE_ARCHIVE_FAILED')
        if (stored.error) {
          const existing = await client.storage.from('regulatory-sources').download(path)
          if (existing.error || !Buffer.from(await existing.data.arrayBuffer()).equals(content)) throw new ImportError('SOURCE_ARCHIVE_MISMATCH')
        }
      }
      const { metadataBytes: _bytes, ...row } = item
      batch.push(row)
    }
    const committed = await client.rpc('commit_tcds_catalog', { p_run_id: runId, p_certificate: certificate, p_records: batch })
    if (committed.error) throw new ImportError('BATCH_COMMIT_FAILED')
    return { mode: 'import', certificate, revisions: committed.data, positiveIncrementalRecords: incremental.length, retrievedAt }
  } catch (error) {
    const code = error instanceof ImportError ? error.code : 'IMPORT_FAILED'
    if (runId) await client.from('ingestion_runs').update({ status: 'failed', completed_at: now(), error_code: code }).eq('id', runId).eq('status', 'running')
    throw new ImportError(code)
  }
}

export function tcdsDeltaNeeded(records,versions,certificate) {
  const known=new Map(versions.filter(row=>row.metadata?.certificate===certificate).map(row=>[row.source_version_id,row]));
  return records.some(record=>{const identity=new URL(record.documentURL).pathname.split('/').at(-1);const old=known.get(identity);return !old||old.status!==record['drs:status'].toLowerCase()||old.metadata?.source_modified_at!==record.docLastModifiedDate;});
}

export async function checkTcdsFamily(client,source,certificate,{now=()=>new Date().toISOString()}={}) {
  if(!/^[A-Z0-9-]{1,20}$/.test(certificate))throw new ImportError('INVALID_CERTIFICATE');
  const sourceName=`FAA:TCDSMODEL:${certificate}`;
  const checkpoint=await client.from('ingestion_checkpoints').select('source_modified_at').eq('source',sourceName).maybeSingle();
  if(checkpoint.error)throw new ImportError('CHECKPOINT_READ_FAILED');
  if(!checkpoint.data?.source_modified_at)return importTcdsFamily(client,source,certificate,{now});
  const since=new Date(Date.parse(checkpoint.data.source_modified_at)-86400000).toISOString();
  const records=await collectTcds(source,since,certificate);
  const identities=records.map(record=>new URL(record.documentURL).pathname.split('/').at(-1));
  let versions=[];
  if(identities.length){const result=await client.from('document_versions').select('source_version_id,status,metadata').in('source_version_id',identities);if(result.error)throw new ImportError('CHECKPOINT_READ_FAILED');versions=result.data??[];}
  if(tcdsDeltaNeeded(records,versions,certificate))return {...await importTcdsFamily(client,source,certificate,{now}),mode:'reconciled'};
  const newest=records.reduce((latest,row)=>!latest||Date.parse(row.docLastModifiedDate)>Date.parse(latest)?row.docLastModifiedDate:latest,checkpoint.data.source_modified_at);
  const heartbeat=await client.rpc('record_source_check',{p_source:sourceName,p_observed_modified_at:newest});
  if(heartbeat.error)throw new ImportError('CHECKPOINT_WRITE_FAILED');
  return {mode:'checked',certificate,deltaRecords:records.length,reconciled:false};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const certificate = (process.argv.find((argument) => argument.startsWith('--certificate='))?.split('=')[1] ?? '').toUpperCase()
    const verifyOnly = process.argv.includes('--verify-only')
    const source = drsClient(process.env.FAA_DRS_API_KEY)
    const config = verifyOnly ? null : readWorkerConfig(process.env)
    const client = config ? createClient(config.url, config.secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(45000) }) },
    }) : null
    console.log(JSON.stringify(await importTcdsFamily(client, source, certificate, { verifyOnly })))
  } catch (error) {
    console.error(JSON.stringify({ status: 'failed', code: error instanceof ImportError ? error.code : 'IMPORT_FAILED' }))
    process.exitCode = 1
  }
}
