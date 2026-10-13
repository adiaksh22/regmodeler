// Optional local browser check. Uses the existing archived Puppeteer installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../research/legacy/mcp-client/node_modules/puppeteer');
const out = path.join(__dirname, '../.artifacts/foundation');
const requireDatabase = process.argv.includes('--database');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [];
  const externalRequests = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url()) && !['http://127.0.0.1:4173','http://127.0.0.1:54321'].includes(new URL(request.url()).origin)) externalRequests.push(request.url()); });
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/tcds/"]').length === 3);
    assert.match(await page.title(), /RegModeler/);
    assert.equal(await page.$$eval('a[href^="/tcds/"]', links => links.length), 3);
    if (requireDatabase) assert.match(await page.evaluate(() => document.body.innerText), /Shared FAA catalog/);
    const fontSize = await page.$eval('h1', element => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(fontSize >= 30, 'Tailwind typography must be present');
    await page.screenshot({ path: path.join(out, 'home.png'), fullPage: true });

    await page.type('input[aria-label="TCDS number"]', ' 2a13 ');
    await page.click('button[type="submit"]');
    await page.waitForSelector('input[aria-label="TCDS number to link"]');
    assert.match(await page.$eval('h1', element => element.textContent), /2A13/);
    assert.match(await page.evaluate(() => document.body.innerText), /Piper Aircraft Inc\./);
    await page.evaluate(() => localStorage.setItem('tcds_documents', JSON.stringify([{ tcds_number: 'KEEP' }])));
    await page.type('input[aria-label="TCDS number to link"]', 'E7CE');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Link').click());
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tcds_cross_references') ?? '[]').length === 1);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Reload Snapshot').click());
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tcds_documents'))[0].tcds_number), 'KEEP');
    assert.equal(await page.evaluate(() => localStorage.getItem('tcds_issues')), null, 'Personal links must not manufacture discrepancies');

    await page.goto('http://127.0.0.1:4173/tcds/UNKNOWN', { waitUntil: 'networkidle0' });
    assert.match(await page.evaluate(() => document.body.innerText), /not included in this catalog/);
    await page.goto('http://127.0.0.1:4173/changelog', { waitUntil: 'networkidle0' });
    assert.match(await page.evaluate(() => document.body.innerText), /Local prototype records/);
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Home page must fit a mobile viewport');
    await page.screenshot({ path: path.join(out, 'home-mobile.png'), fullPage: true });
    assert.deepEqual(errors, [], 'No browser runtime errors');
    assert.deepEqual(externalRequests, [], 'Prototype must not issue live source requests');
    // A portfolio visitor can still browse when the free database is unavailable.
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith('http://127.0.0.1:54321/')) void request.respond({ status: 500, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
      else void request.continue();
    });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
    if (requireDatabase) {
      await page.waitForFunction(() => document.body.innerText.includes('online catalog is unavailable'));
      assert.equal(await page.$$eval('a[href^="/tcds/"]', links => links.length), 3);
    }
    console.log('Browser smoke passed: catalog API/demo, search, verified detail, personal links, reload preservation, unknown TCDS, change log, mobile layout, and graceful outage fallback.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
