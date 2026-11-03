const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1440,height:1050});
  await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-10',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[aria-labelledby="family-overview-title"]')?.textContent.includes('230 seats'),{timeout:30000});
  assert.equal(await page.$$eval('[aria-label="Reviewed Boeing 737 variants"] button',nodes=>nodes.length),7);
  const family=await page.$eval('[aria-labelledby="family-overview-title"]',node=>node.innerText);
  assert.match(family,/197,900 lb/);assert.match(family,/Type C/);assert.match(family,/Reviewed TCDS revision: 82/);assert.match(family,/Matches the imported current revision/);assert.doesNotMatch(family,/not listed|Earlier revision/);
  assert.match(await page.$eval('body',node=>node.innerText),/Related AD\/STC discovery and monitoring have not been configured for this model/);
  await page.waitForSelector('[aria-label="Node connections"] button',{timeout:30000});
  assert.equal(await page.$$eval('[aria-label="Node connections"] button',nodes=>nodes.length),3);
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(node=>node.textContent.includes('LEAP-1B')).click());
  const evidence=await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText);assert.match(evidence,/82.*page 67/);
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Relationship source evidence"] button')].find(node=>node.textContent==='View cited PDF').click());
  await page.waitForSelector('[aria-label="Archived source PDF"]',{timeout:20000});
  assert.match(await page.$eval('iframe[title="Archived source PDF"]',node=>node.src),/#page=67$/);
  await page.click('[aria-label="Close PDF"]');
  await page.screenshot({path:'.artifacts/revision82-desktop.png',fullPage:true});
  await page.click('#tab-related');await page.waitForFunction(()=>document.querySelector('#panel-related')?.textContent.includes('not been configured'),{timeout:20000});
  await page.select('#aircraft-model','737-800');await page.click('#tab-relationships');
  await page.waitForFunction(()=>document.querySelector('[aria-labelledby="family-overview-title"]')?.textContent.includes('174,200 lb'),{timeout:20000});
  await page.click('#tab-history');await page.waitForFunction(()=>/Revision history \(\d+\)/.test(document.querySelector('#tab-history')?.textContent??''),{timeout:20000});
  assert.ok(Number((await page.$eval('#tab-history',node=>node.textContent)).match(/\d+/)[0])>=58);
  await page.select('#aircraft-model','737-10');await page.click('#tab-relationships');
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'.artifacts/revision82-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['seven reviewed approved variants','MAX 10 exit-dependent limits','current Revision 82 facts','three MAX 10 node paths','page-67 archived citation','explicit AD/STC coverage limit','NG model switch','58+ revisions','mobile width','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
