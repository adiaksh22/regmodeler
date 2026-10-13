const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const puppeteer = require('../research/legacy/mcp-client/node_modules/puppeteer');
const out = path.join(__dirname, 'evidence');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  try {
    const page = await browser.newPage();
    await page.goto('https://drs.faa.gov/help', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => [...document.querySelectorAll('a')].find(a => a.textContent.trim() === 'DRS Application Programming Interface (API)')?.click());
    await new Promise(resolve => setTimeout(resolve, 2000));
    fs.writeFileSync(path.join(out, 'drs-api-help-text.txt'), await page.evaluate(() => document.body.innerText));
    const help = await page.evaluate(async () => { const r = await fetch('/api/help/drs-api/ids'); return { status: r.status, body: await r.text() }; });
    fs.writeFileSync(path.join(out, 'drs-api-help-ids.json'), JSON.stringify(help, null, 2));
    console.log(JSON.stringify({ help }));
    for (const [name, guid] of [
      ['2A13', 'DRSDOCID125895332520251113164724.0001'],
      ['E7CE', 'DRSDOCID148994589720230223190439.0001'],
      ['P19NE', '65F15764601662218625870C00615523.0001']
    ]) {
      try {
        await page.goto('https://drs.faa.gov/browse/excelExternalWindow/' + guid, { waitUntil: 'networkidle2', timeout: 30000 });
        const summary = await page.evaluate(async guid => { const r = await fetch('/api/browse/documents/summaryguiddocview/' + guid); return { status: r.status, body: await r.text() }; }, guid);
        fs.writeFileSync(path.join(out, 'tcds-' + name + '-verified.json'), JSON.stringify(summary, null, 2));
        if (summary.status !== 200) { console.log(JSON.stringify({ name, status: summary.status })); continue; }
        const doc = JSON.parse(summary.body);
        const pdf = await page.evaluate(async id => { const r = await fetch('/api/content/alf/' + id); if (!r.ok) return { status: r.status }; const a = new Uint8Array(await r.arrayBuffer()); let binary = ''; for (let i = 0; i < a.length; i += 8192) binary += String.fromCharCode(...a.subarray(i, i + 8192)); return { status: r.status, type: r.headers.get('content-type'), base64: btoa(binary) }; }, doc.id);
        const result = { name, guid, checkedAt: new Date().toISOString(), metadata: doc.metadatas, fileId: doc.id, pdfStatus: pdf.status, pdfType: pdf.type, hasVersion: doc.hasVersion };
        if (pdf.base64) { const bytes = Buffer.from(pdf.base64, 'base64'); fs.writeFileSync(path.join(out, 'tcds-' + name + '.pdf'), bytes); result.bytes = bytes.length; result.sha256 = crypto.createHash('sha256').update(bytes).digest('hex'); result.pdfMagic = bytes.subarray(0, 5).toString(); }
        const versionResponse = await page.evaluate(async ({ id, type }) => { const r = await fetch('/api/browse/documents/history/' + id + '?docTypeId=' + type); return { status: r.status, body: await r.text() }; }, { id: doc.id, type: doc.docTypeId });
        fs.writeFileSync(path.join(out, 'tcds-' + name + '-history.json'), JSON.stringify(versionResponse, null, 2));
        result.historyStatus = versionResponse.status;
        results.push(result);
        console.log(JSON.stringify(result));
      } catch (error) { results.push({ name, error: error.message }); console.log(JSON.stringify({ name, error: error.message })); }
    }
  } finally { fs.writeFileSync(path.join(out, 'drs-sample-results.json'), JSON.stringify(results, null, 2)); await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
