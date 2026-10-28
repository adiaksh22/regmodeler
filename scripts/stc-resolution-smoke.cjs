const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const model of ['737-700','737-800']){
   await page.setViewport({width:1440,height:1050});
   await page.goto(`http://127.0.0.1:4173/tcds/A16WE?model=${model}`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[aria-label="Node connections"]')?.textContent.includes('ST04009NY'),{timeout:30000});
   const links=await page.$eval('[aria-label="Node connections"]',node=>node.innerText);
   assert.match(links,new RegExp(model==='737-700'?'AC25-1346':'AC25-1340'));
   assert.doesNotMatch(links,new RegExp(model==='737-700'?'AC25-1340':'AC25-1346'));
   await page.evaluate(model=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes(`STC ST04009NY → ${model}`)).click(),model);
   assert.match(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText),/All three certificate pages/);
   await page.evaluate(model=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes(`STC SA01635LA → ${model}`)).click(),model);
   await page.waitForFunction(()=>document.querySelector('[aria-label="Source-quality findings"]')?.textContent.includes('ST01635LA'),{timeout:15000});
   assert.match(await page.$eval('[aria-label="Source-quality findings"]',node=>node.innerText),/not treated as interchangeable/);
   await page.click('#tab-related');await page.select('[aria-label="Related document type"]','STC');
   await page.type('[aria-label="Filter related records"]','SA04009NY');
   await page.waitForFunction(()=>document.querySelector('#panel-related button[aria-pressed]')?.textContent.includes('SA04009NY'),{timeout:15000});
   await page.click('#panel-related button[aria-pressed]');
   await page.waitForFunction(()=>document.querySelector('[aria-label="Source-quality findings"]')?.textContent.includes('ST04009NY'),{timeout:15000});
   assert.match(await page.$eval('[aria-label="Source-quality findings"] a',node=>node.href),/DRSDOCID198838941920250501135110\.0001$/);
   assert.match(await page.$eval('[aria-label="Source-quality findings"]',node=>node.innerText),/no identity merge or supersession is inferred/);
   await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['two complete STCs','model-specific maintenance references','partial-SA original warning','separate reviewed STC links','identity preservation','mobile layout']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
