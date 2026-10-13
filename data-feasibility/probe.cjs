const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = path.join(__dirname, 'evidence');
fs.mkdirSync(out, { recursive: true });
const targets = [
  ['drs-home', 'https://drs.faa.gov/'],
  ['drs-tcds', 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID125895332520251113164724.0001'],
  ['ecfr-titles', 'https://www.ecfr.gov/api/versioner/v1/titles.json'],
  ['ecfr-part39', 'https://www.ecfr.gov/api/versioner/v1/full/2026-10-01/title-14.xml?part=39'],
  ['federal-register', 'https://www.federalregister.gov/api/v1/documents.json?conditions%5Bagencies%5D%5B%5D=federal-aviation-administration&per_page=3&order=newest'],
  ['govinfo-title14', 'https://www.govinfo.gov/bulkdata/ECFR/title-14/ECFR-title14.xml'],
];
(async () => {
  const results = await Promise.all(targets.map(async ([name, url]) => {
    const started = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'Accept-Encoding': 'gzip', 'User-Agent': 'RegModeler-DataFeasibility/0.1' } });
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(path.join(out, name + '.raw'), buffer);
      const body = buffer.toString('utf8');
      const result = { name, url, finalUrl: response.url, status: response.status, contentType: response.headers.get('content-type'), bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), checkedAt: new Date().toISOString(), ms: Date.now() - started, prefix: body.slice(0, 120) };
      if (name === 'drs-home') result.scripts = [...body.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
      if (name === 'ecfr-titles' && response.ok) { try { result.title14 = JSON.parse(body).titles?.find(t => t.number === 14); } catch {} }
      if (name === 'federal-register' && response.ok) { try { const data = JSON.parse(body); result.count = data.count; result.documents = data.results?.map(d => ({ title: d.title, number: d.document_number, date: d.publication_date, json_url: d.json_url, pdf_url: d.pdf_url })); } catch {} }
      console.log(JSON.stringify(result));
      return result;
    } catch (error) { const result = { name, url, error: error.message, cause: error.cause?.code, checkedAt: new Date().toISOString() }; console.log(JSON.stringify(result)); return result; }
  }));
  fs.writeFileSync(path.join(out, 'probe-results.json'), JSON.stringify(results, null, 2));
})();
