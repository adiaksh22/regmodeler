import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const origin = 'https://drs.faa.gov';
export class ImportError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function drsClient(key, { request = fetch, sleep = delay } = {}) {
  if (!key || !/^[\x21-\x7e]+$/.test(key)) throw new ImportError('FAA_KEY_MISSING_OR_INVALID');
  async function read(url, body, maxBytes = 5_000_000) {
    const target = new URL(url, origin);
    if (target.origin !== origin || target.username || target.password ||
        !target.pathname.startsWith('/api/drs/data-pull/')) throw new ImportError('UNTRUSTED_SOURCE_URL');
    for (let attempt = 0; attempt < 3; attempt++) {
      let response;
      try {
        response = await request(target, {
          method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(45000),
          headers: { 'x-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      } catch {
        if (attempt === 2) throw new ImportError('FAA_NETWORK_ERROR');
        await sleep(1000 * (attempt + 1)); continue;
      }
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 2) {
        await response.body?.cancel(); await sleep(1000 * (attempt + 1)); continue;
      }
      if (!response.ok) throw new ImportError(`FAA_HTTP_${response.status}`);
      const chunks = []; let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maxBytes) { throw new ImportError('SOURCE_FILE_TOO_LARGE'); }
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
  }
  return {
    async attachment(url) {
      const target=new URL(url);
      if(target.origin!==origin||!/^\/api\/drs\/data-pull\/download\/[a-f0-9-]+$/i.test(target.pathname)||target.search||target.hash)throw new ImportError('UNTRUSTED_SOURCE_URL');
      return read(target.href,undefined,10_000_000);
    },
    async attachments(url) {
      const target=new URL(url);
      if(target.origin!==origin||!/^\/api\/drs\/data-pull\/get-other-attachment-details\/[a-f0-9-]+$/i.test(target.pathname)||target.search||target.hash)throw new ImportError('UNTRUSTED_SOURCE_URL');
      const bytes=await read(target.href,undefined,2_000_000);
      try{return JSON.parse(bytes.toString('utf8'));}catch{throw new ImportError('INVALID_ATTACHMENT_JSON');}
    },
    async metadata(type, filters, offset = 0, since) {
      if (!['ADFRAWD','STC','CAR'].includes(type)) throw new ImportError('UNSUPPORTED_DOCUMENT_TYPE');
      const bytes = await read(`/api/drs/data-pull/${type}/filtered`, {
        offset, sortOrder: 'ASC', ...(since ? { docLastModifiedDate: since } : {}), documentFilters: filters,
      }, 20_000_000);
      try { return JSON.parse(bytes.toString('utf8')); } catch { throw new ImportError('INVALID_METADATA_JSON'); }
    },
    async page(offset = 0, since) {
      const bytes = await read('/api/drs/data-pull/TCDSMODEL/filtered', {
        offset, sortOrder: 'ASC', ...(since ? { docLastModifiedDate: since } : {}),
        documentFilters: { 'drs:documentNumber': ['2A13'] },
      });
      try { return JSON.parse(bytes.toString('utf8')); } catch { throw new ImportError('INVALID_METADATA_JSON'); }
    },
    async pdf(url) {
      const bytes = await read(url, undefined, 25_000_000);
      if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new ImportError('INVALID_PDF');
      return bytes;
    },
  };
}
export async function collectTcds(client, since) {
  const rows = []; const seen = new Set(); let total;
  for (let page = 0; page < 50; page++) {
    const offset = page * 750;
    const result = await client.page(offset, since);
    const summary = result.summary;
    if (!Array.isArray(result.documents) || !summary || typeof summary.hasMoreItems !== 'boolean' ||
        summary.count !== result.documents.length || result.documents.length > 750 ||
        (summary.offset !== undefined && summary.offset !== offset) ||
        !Number.isInteger(summary.totalItems) || summary.totalItems < 0) throw new ImportError('INVALID_PAGE');
    if (total !== undefined && total !== summary.totalItems) throw new ImportError('CATALOG_CHANGED_DURING_PAGING');
    total = summary.totalItems;
    for (const record of result.documents) {
      validateTcds(record);
      if (seen.has(record.documentURL)) throw new ImportError('DUPLICATE_PAGE_RECORD');
      if (since && Date.parse(record.docLastModifiedDate) <= Date.parse(since)) throw new ImportError('INCREMENTAL_FILTER_MISMATCH');
      seen.add(record.documentURL); rows.push(record);
    }
    if (!summary.hasMoreItems) {
      if (rows.length !== total) throw new ImportError('INCOMPLETE_CATALOG');
      return rows;
    }
    if (result.documents.length !== 750) throw new ImportError('INCOMPLETE_PAGE');
  }
  throw new ImportError('PAGE_LIMIT_EXCEEDED');
}
export function validateTcds(record) {
  const url = new URL(record.documentURL);
  if (record['drs:documentNumber'] !== '2A13' || url.origin !== origin || url.username || url.password ||
      !/^\/browse\/excelExternalWindow\/[A-Za-z0-9.]+$/.test(url.pathname) || url.search || url.hash ||
      typeof record.documentGuid !== 'string' || !url.pathname.split('/').at(-1).startsWith(record.documentGuid + '.') ||
      !['Current','Historical','Pending'].includes(record['drs:status']) ||
      typeof record['drs:tcdsmodelRevisionNumber'] !== 'string' || !record['drs:tcdsmodelRevisionNumber'].trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record['drs:tcdsmodelRevisionDate']) ||
      !Number.isFinite(Date.parse(record['drs:tcdsmodelRevisionDate'])) ||
      !Number.isFinite(Date.parse(record.docLastModifiedDate)) ||
      !Array.isArray(record['drs:tcdsmodelModel']) || !record['drs:tcdsmodelModel'].some(m=>/^PA-28/.test(m)) ||
      record['drs:tcdsmodelModel'].some(m=>typeof m!=='string') || !record.mainDocumentDownloadURL) {
    throw new ImportError('INVALID_TCDS_RECORD');
  }
}
export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
export function metadataFingerprint(record) { return sha256(Buffer.from(JSON.stringify(canonical(record)))); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
export function snapshot(record, bytes, retrievedAt) {
  validateTcds(record);
  const hash = sha256(bytes);
  const metadataBytes = Buffer.from(JSON.stringify(canonical(record)));
  const metadataHash = sha256(metadataBytes);
  const fingerprint = sha256(Buffer.from(hash + ':' + metadataHash));
  return {
    source_version_id: new URL(record.documentURL).pathname.split('/').at(-1),
    revision_label: record['drs:tcdsmodelRevisionNumber'], revision_date: record['drs:tcdsmodelRevisionDate'],
    status: record['drs:status'].toLowerCase(), source_url: record.documentURL, retrieved_at: retrievedAt,
    content_sha256: hash, storage_path: `FAA/TCDS/2A13/${hash}.pdf`,
    metadata: {
      model: [...new Set(record['drs:tcdsmodelModel'])].sort().join(' | '),
      holder: record['drs:tcdsmodelTCHolder'], product_type: record['drs:tcdsmodelProductType'],
      source_modified_at: record.docLastModifiedDate, source_guid: record.documentGuid,
      source_identity: new URL(record.documentURL).pathname.split('/').at(-1),
      snapshot_sha256: fingerprint, metadata_storage_path: `FAA/TCDS/2A13/${metadataHash}.json`,
      additional_attachments_pending: record.hasMoreAttachments === true,
    },
    metadataBytes,
  };
}
