const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const puppeteer = require('../research/legacy/mcp-client/node_modules/puppeteer');
const out = path.join(__dirname, 'evidence');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    await page.goto('https://drs.faa.gov/help', { waitUntil: 'networkidle2', timeout: 30000 });
    for (const [name, id] of [
      ['drs-api-technical.pdf', '672a7d0c-e369-4963-a2a5-63ed2772ac1d'],
      ['drs-metadata-mapping.xlsx', 'c69659ec-aed4-46e7-a440-13c02cceb7e4'],
      ['tcds-2A13-rev65.pdf', '23083aa8-a30b-4f87-8031-676c0264707d']
    ]) {
      const data = await page.evaluate(async id => { const r = await fetch('/api/content/alf/' + id); if (!r.ok) return { status: r.status }; const bytes = new Uint8Array(await r.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192)); return { status: r.status, type: r.headers.get('content-type'), base64: btoa(binary) }; }, id);
      const result = { name, id, status: data.status, type: data.type, checkedAt: new Date().toISOString() };
      if (data.base64) { const bytes = Buffer.from(data.base64, 'base64'); fs.writeFileSync(path.join(out, name), bytes); result.bytes = bytes.length; result.sha256 = crypto.createHash('sha256').update(bytes).digest('hex'); }
      fs.writeFileSync(path.join(out, name + '.receipt.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
