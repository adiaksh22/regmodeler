// Read the key from the process environment. Never print or persist it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = path.join(__dirname, 'evidence');
const key = process.env.FAA_DRS_API_KEY;
if (!key) { console.error('Pending: set FAA_DRS_API_KEY locally, then rerun this probe. Do not put the key in source code or chat.'); process.exit(2); }
if (!/^[\x21-\x7e]+$/.test(key)) {
  console.error('Invalid API key input: expected a single value without whitespace. Enter the generated key, not the PowerShell instructions.');
  process.exit(2);
}
async function request(url) {
  const target = new URL(url, 'https://drs.faa.gov');
  if (target.origin !== 'https://drs.faa.gov') throw new Error('Unexpected API origin');
  return fetch(target, { headers: { 'x-api-key': key, 'Accept-Encoding': 'gzip' }, signal: AbortSignal.timeout(45000), redirect: 'error' });
}
(async () => {
  const receipts = [];
  for (const type of ['TCDSMODEL', 'STC', 'ADFREAD']) {
    const url = `https://drs.faa.gov/api/drs/data-pull/${type}?offset=0&docLastModifiedDateSortOrder=DESC`;
    const response = await request(url);
    const result = { type, status: response.status, checkedAt: new Date().toISOString() };
    if (!response.ok) { receipts.push(result); console.log(JSON.stringify(result)); if ([401, 403].includes(response.status)) break; continue; }
    const data = await response.json();
    fs.writeFileSync(path.join(out, 'api-' + type + '.json'), JSON.stringify(data, null, 2));
    result.summary = data.summary;
    result.returned = data.documents?.length;
    if (!Array.isArray(data.documents) || data.documents.length === 0) throw new Error('No documents in API response');
    const downloadable = data.documents.find(d => d.mainDocumentDownloadURL);
    if (downloadable) {
      const download = await request(downloadable.mainDocumentDownloadURL);
      result.downloadStatus = download.status;
      if (download.ok) {
        const bytes = Buffer.from(await download.arrayBuffer());
        fs.writeFileSync(path.join(out, 'api-' + type + '-sample.bin'), bytes);
        result.downloadBytes = bytes.length;
        result.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        result.magic = bytes.subarray(0, 5).toString();
      }
    }
    if (data.summary?.hasMoreItems) {
      const next = await request(`https://drs.faa.gov/api/drs/data-pull/${type}?offset=750&docLastModifiedDateSortOrder=DESC`);
      result.secondPageStatus = next.status;
      if (next.ok) { const second = await next.json(); result.secondPageSummary = second.summary; fs.writeFileSync(path.join(out, 'api-' + type + '-page2.json'), JSON.stringify(second, null, 2)); }
    }
    const modified = data.documents.map(d => d.docLastModifiedDate).filter(Boolean).sort().at(-1);
    if (modified) {
      const incremental = await request(`https://drs.faa.gov/api/drs/data-pull/${type}?offset=0&docLastModifiedDate=${encodeURIComponent(modified)}&docLastModifiedDateSortOrder=ASC`);
      result.incrementalStatus = incremental.status;
      if (incremental.ok) result.incrementalSummary = (await incremental.json()).summary;
    }
    receipts.push(result);
    console.log(JSON.stringify(result));
  }
  fs.writeFileSync(path.join(out, 'api-key-probe-results.json'), JSON.stringify(receipts, null, 2));
})().catch(error => {
  // HTTP-client error messages can contain header values. Never echo them.
  const code = error.cause?.code || error.code;
  console.error('API probe failed. Error type:', error.name);
  if (typeof code === 'string' && /^[A-Z0-9_]+$/.test(code)) console.error('Error code:', code);
  process.exitCode = 1;
});
