// Read-only hosted-data journey; isolated browser storage, no FAA calls or database writes.
const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
let phase='home';
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1280,height:900});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  phase='model search';
  await page.type('#catalog-search','PA-28-181');await page.click('button[type="submit"]');
  await page.waitForFunction(()=>document.querySelectorAll('a[href^="/tcds/"]').length===1);
  await page.click('a[href^="/tcds/"]');await page.waitForSelector('#tab-relationships');
  assert.equal(await page.$eval('#aircraft-model',node=>node.value),'PA-28-181');
  assert.equal(await page.$$eval('[role="tab"][tabindex="0"]',nodes=>nodes.length),1);
  phase='keyboard history';
  await page.focus('#tab-relationships');await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-history');
  assert.equal(await page.$eval('#tab-relationships',node=>node.getAttribute('aria-selected')),'true','Arrow keys move focus without triggering data requests');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#tab-history')?.textContent.includes('(23)'));
  phase='keyboard wrap';
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-review');
  await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-relationships');
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-review');
  phase='related records';
  await page.focus('#tab-related');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#panel-related')?.textContent.includes('with current FAA status'));
  phase='related history filter';
  await page.click('#panel-related input[type="checkbox"]');
  await page.waitForFunction(()=>document.querySelector('#panel-related')?.textContent.includes('including history'));
  await page.type('[aria-label="Filter related records"]','2022-03-15');
  await page.waitForFunction(()=>[...document.querySelectorAll('#panel-related button[aria-pressed]')].some(node=>node.textContent.includes('AD 2022-03-15')));
  await page.evaluate(()=>[...document.querySelectorAll('#panel-related button[aria-pressed]')].find(node=>node.textContent.includes('AD 2022-03-15')).click());
  await page.waitForSelector('[aria-label="Related record details"]');
  assert.match(await page.$eval('[aria-label="Related record details"]',node=>node.innerText),/reviewed/i);
  phase='change feed';
  await page.goto('http://127.0.0.1:4173/changelog',{waitUntil:'domcontentloaded'});
  assert.equal(await page.$eval('nav a[aria-current="page"]',node=>node.textContent),'Source changes');
  await page.select('[aria-label="Change feed model"]','737-800');
  await page.waitForFunction(()=>!document.body.innerText.includes('Loading source changes'));
  assert.match(await page.$eval('[aria-label="Shared source change feed"]',node=>node.innerText),/not a complete|baseline|source observations/i);
  phase='mobile';
  for(const width of [320,390]){
   await page.setViewport({width,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Change feed must fit ${width}px`);
  }
  phase='unknown route';
  await page.goto('http://127.0.0.1:4173/not-a-page',{waitUntil:'domcontentloaded'});
  assert.equal(await page.$eval('h1',node=>node.textContent),'Page not found');
  await page.click('main a');await page.waitForSelector('#catalog-search');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  phase='empty search';
  await page.type('#catalog-search','NO-SUCH-MODEL');await page.click('button[type="submit"]');
  await page.waitForFunction(()=>document.body.innerText.includes('No catalog matches'));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Clear search').click());
  await page.waitForSelector('a[href^="/tcds/"]');
  await page.screenshot({path:'.artifacts/beta-home-mobile.png',fullPage:true});
  phase='catalog outage and recovery';
  let outage=true;
  await page.setRequestInterception(true);
  page.on('request',request=>{
   if(outage&&new URL(request.url()).hostname.endsWith('.supabase.co'))void request.respond({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'},body:'{}'});
   else void request.continue();
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.innerText.includes('online catalog is unavailable'));
  assert.equal(await page.$$eval('a[href^="/tcds/"]',nodes=>nodes.length),require('../src/data/tcds-samples.json').length,'Outage fallback must be labeled saved samples');
  await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.innerText.includes('Imported history and relationships are temporarily unavailable'));
  outage=false;
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Reload catalog').click());
  await page.waitForSelector('[aria-label="Relationship source evidence"]');
  assert.doesNotMatch(await page.$eval('body',node=>node.innerText),/online catalog is unavailable|Imported history and relationships are temporarily unavailable/);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['model-first search','manual keyboard tab navigation','loaded revision history','related record evidence','current/history filter','active navigation','change-feed model filter','320/390px layout','unknown route recovery','empty search recovery','labeled outage fallback','retry restores live relationships','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;});
