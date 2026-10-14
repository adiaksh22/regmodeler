// Optional local browser check. Uses the existing archived Puppeteer installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../research/legacy/mcp-client/node_modules/puppeteer');
const out = path.join(__dirname, '../.artifacts/foundation');
const requireDatabase = process.argv.includes('--database');
const apiOrigin = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321';
fs.mkdirSync(out, { recursive: true });
let phase='home';
const apiResponses=[];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const errors = [];
  const externalRequests = [];
  try {
    const page = await browser.newPage();
    page.on('response',response=>{if(response.url().startsWith(apiOrigin+'/'))apiResponses.push({path:new URL(response.url()).pathname,status:response.status()});});
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url()) && !['http://127.0.0.1:4173',apiOrigin].includes(new URL(request.url()).origin)) externalRequests.push(request.url()); });
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelectorAll('a[href^="/tcds/"]').length === 3);
    assert.match(await page.title(), /RegModeler/);
    assert.equal(await page.$$eval('a[href^="/tcds/"]', links => links.length), 3);
    if (requireDatabase) assert.match(await page.evaluate(() => document.body.innerText), /Shared FAA catalog/);
    const fontSize = await page.$eval('h1', element => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(fontSize >= 30, 'Tailwind typography must be present');
    await page.screenshot({ path: path.join(out, 'home.png'), fullPage: true });

    phase='detail';
    await page.type('input[aria-label="Aircraft model or TCDS number"]', ' 2a13 ');
    await page.click('button[type="submit"]');
    await page.waitForSelector('input[aria-label="TCDS number to link"]');
    assert.match(await page.$eval('h1', element => element.textContent), /2A13/);
    assert.match(await page.evaluate(() => document.body.innerText), /Piper Aircraft Inc\./);
    if(requireDatabase) {
      await page.waitForFunction(()=>document.body.innerText.includes('FAR 23.955'));
      assert.equal(await page.$eval('#aircraft-model',element=>element.value),'PA-28-181');
      await page.screenshot({path:path.join(out,'relationships.png'),fullPage:true});
      await page.select('#aircraft-model','PA-28-140');
      await page.waitForFunction(()=>document.body.innerText.includes('How PA-28-140 connects'));
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('FAR 23.955')).click());
      assert.match(await page.evaluate(()=>document.body.innerText),/page 35/);
      phase='dated regulation reference';
      await page.evaluate(()=>[...document.querySelectorAll('summary')].find(b=>b.textContent.includes('Fuel flow')).click());
      assert.match(await page.evaluate(()=>document.body.innerText),/Later reference edition dated 2016-01-01/);
      assert.match(await page.evaluate(()=>document.body.innerText),/not the historical amendment wording/);
      phase='AD source traversal';
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('AD 2020-24-05')).click());
      assert.match(await page.evaluate(()=>document.body.innerText),/28-20001 through 28-26946/);
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Explore referenced documents').click());
      assert.match(await page.evaluate(()=>document.body.innerText),/Piper SB 1304A/);
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='View cited PDF').click());
      await page.waitForSelector('[role="dialog"] iframe');
      assert.match(await page.$eval('[role="dialog"] iframe',frame=>frame.src),/#page=7$/);
      await page.keyboard.press('Escape');
      await page.waitForSelector('[role="dialog"]',{hidden:true});
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Back to PA-28-140').click());
      phase='related current and historical records';
      await page.click('#tab-related');
      await page.waitForFunction(()=>document.body.innerText.includes('with current FAA status'));
      const current=await page.$$eval('#panel-related button[aria-pressed]',items=>items.length);
      assert.ok(current>0);
      await page.click('#panel-related input[type="checkbox"]');
      assert.match(await page.evaluate(()=>document.body.innerText),/including history/);
      await page.type('input[aria-label="Filter related records"]','2020-24-05');
      await page.evaluate(()=>[...document.querySelectorAll('#panel-related button')].find(b=>b.textContent.startsWith('AD 2020-24-05')).click());
      assert.match(await page.evaluate(()=>document.body.innerText),/Source connection reviewed/);
      await page.select('select[aria-label="Related document type"]','STC');
      await page.$eval('input[aria-label="Filter related records"]',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});
      await page.click('input[aria-label="Filter related records"]',{clickCount:3});
      await page.keyboard.press('Backspace');await page.type('input[aria-label="Filter related records"]','SA2230CE');
      await page.evaluate(()=>[...document.querySelectorAll('#panel-related button')].find(b=>b.textContent.startsWith('STC SA2230CE')).click());
      assert.match(await page.evaluate(()=>document.body.innerText),/Original PDF archived/);
      await page.screenshot({path:path.join(out,'related-records.png'),fullPage:true});
      await page.click('#tab-relationships');
      await page.select('#aircraft-model','PA-28-161');
      assert.match(await page.evaluate(()=>document.body.innerText),/No reviewed relationships/);
      await page.click('#tab-history');
      await page.waitForFunction(()=>document.body.innerText.includes('Show all 23 revisions'));
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Show all 23 revisions').click());
      assert.equal(await page.$$eval('ol li',items=>items.length),23);
      await page.evaluate(()=>[...document.querySelectorAll('summary')].find(b=>b.textContent==='Compare archived revisions').click());
      assert.match(await page.evaluate(()=>document.body.innerText),/archived PDF bytes differ/);
    }
    phase='personal links';
    await page.evaluate(() => localStorage.setItem('tcds_documents', JSON.stringify([{ tcds_number: 'KEEP' }])));
    await page.type('input[aria-label="TCDS number to link"]', 'E7CE');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Link').click());
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('tcds_cross_references') ?? '[]').length === 1);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Reload catalog').click());
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tcds_documents'))[0].tcds_number), 'KEEP');
    assert.equal(await page.evaluate(() => localStorage.getItem('tcds_issues')), null, 'Personal links must not manufacture discrepancies');

    phase='unknown and change log';
    await page.goto('http://127.0.0.1:4173/tcds/UNKNOWN', { waitUntil: 'networkidle0' });
    assert.match(await page.evaluate(() => document.body.innerText), /not included in this catalog/);
    await page.goto('http://127.0.0.1:4173/changelog', { waitUntil: 'networkidle0' });
    assert.match(await page.evaluate(() => document.body.innerText), /Local prototype records/);
    if(requireDatabase){
      await page.waitForFunction(()=>document.body.innerText.includes('baseline established'));
      assert.match(await page.evaluate(()=>document.body.innerText),/No recorded events/);
      await page.screenshot({path:path.join(out,'source-changes.png'),fullPage:true});
      const fixture={id:'00000000-0000-4000-8000-000000000001',document_type:'AD',document_number:'TEST-FIXTURE',kind:'changed',models:['PA-28-140'],changed_fields:['metadata','source_status'],detected_at:'2026-10-14T00:00:00Z',old_version_id:null,new_version_id:null,old_source_status:'current',new_source_status:'historical',old_revision:'Before',new_revision:'After',old_source_url:'https://drs.faa.gov/',new_source_url:'https://drs.faa.gov/',old_metadata:{title:'Previous fixture title'},new_metadata:{title:'Changed fixture title'}};
      await page.setRequestInterception(true);const fixtureHandler=request=>{if(new URL(request.url()).pathname==='/rest/v1/source_change_feed')void request.respond({status:request.method()==='OPTIONS'?204:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':request.headers()['access-control-request-headers']??'*','Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Expose-Headers':'Content-Range','Content-Range':'0-0/1'},body:request.method()==='OPTIONS'?'':JSON.stringify([fixture])});else void request.continue();};page.on('request',fixtureHandler);
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Reload source checks').click());
      await page.waitForFunction(()=>document.body.innerText.includes('TEST-FIXTURE'));
      await page.evaluate(()=>[...document.querySelectorAll('summary')].find(b=>b.textContent==='Compare stored metadata observations').click());
      assert.match(await page.evaluate(()=>document.body.innerText),/Previous fixture title/);assert.match(await page.evaluate(()=>document.body.innerText),/Changed fixture title/);assert.match(await page.evaluate(()=>document.body.innerText),/current → historical/);
      await page.setRequestInterception(false);page.off('request',fixtureHandler);
    }
    phase='mobile';
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Home page must fit a mobile viewport');
    await page.screenshot({ path: path.join(out, 'home-mobile.png'), fullPage: true });
    await page.type('input[aria-label="Aircraft model or TCDS number"]','PA-28-181');
    await page.click('button[type="submit"]');
    await page.waitForFunction(()=>document.querySelectorAll('a[href^="/tcds/"]').length===1);
    await page.click('a[href^="/tcds/"]');
    await page.waitForSelector('#aircraft-model');
    if(requireDatabase)await page.waitForFunction(()=>document.body.innerText.includes('FAR 23.955'));
    assert.equal(await page.$eval('#aircraft-model',element=>element.value),'PA-28-181');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Aircraft explorer must fit a mobile viewport');
    await page.screenshot({path:path.join(out,'aircraft-mobile.png'),fullPage:true});
    if(requireDatabase){
      await page.click('#tab-related');await page.waitForFunction(()=>document.body.innerText.includes('with current FAA status'));
      await page.select('select[aria-label="Related document type"]','STC');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Related records must fit a mobile viewport');
      await page.screenshot({path:path.join(out,'related-mobile.png'),fullPage:true});
    }
    assert.deepEqual(errors, [], 'No browser runtime errors');
    assert.deepEqual(externalRequests, [], 'Prototype must not issue live source requests');
    // A portfolio visitor can still browse when the free database is unavailable.
    phase='outage fallback';
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith(apiOrigin+'/')) void request.respond({ status: 500, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
      else void request.continue();
    });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
    if (requireDatabase) {
      await page.waitForFunction(() => document.body.innerText.includes('online catalog is unavailable'));
      assert.equal(await page.$$eval('a[href^="/tcds/"]', links => links.length), 3);
    }
    console.log('Browser smoke passed: model search, source graph traversal, dated text, cited PDF, current/history discovery, revision comparison, personal links, mobile layout, and outage fallback.');
  } finally { await browser.close(); }
})().catch(error => { console.error('Browser check failed during:',phase);console.error(JSON.stringify(apiResponses));console.error(error.stack);process.exitCode = 1; });
