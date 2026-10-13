const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../research/legacy/mcp-client/node_modules/puppeteer');
const out = path.join(__dirname, 'evidence');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    page.on('response', async response => {
      const url = response.url();
      if (!url.includes('/api/')) return;
      console.log(JSON.stringify({ request: url.split('?')[0], status: response.status() }));
      if (response.ok() && /\/help\/drs-api\/ids|\/summaryguiddocview\//.test(url)) {
        const body = await response.text();
        const name = url.includes('/help/') ? 'browser-api-help' : 'browser-tcds-summary';
        fs.writeFileSync(path.join(out, name + '.json'), body);
        console.log(JSON.stringify({ saved: name, bytes: body.length, prefix: body.slice(0, 120) }));
      }
    });
    for (const [name, url] of [
      ['help', 'https://drs.faa.gov/help'],
      ['tcds', 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID125895332520251113164724.0001']
    ]) {
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 3000));
        const text = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync(path.join(out, 'browser-' + name + '.txt'), text);
        console.log(JSON.stringify({ page: name, finalUrl: page.url(), text: text.slice(0, 4500) }));
      } catch (error) { console.log(JSON.stringify({ page: name, error: error.message })); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
