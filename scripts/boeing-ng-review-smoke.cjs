// Targeted production-preview validation; isolated browser profile only.
const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const model of ['737-700','737-800']){
   await page.setViewport({width:1440,height:1050});
   await page.goto(`http://127.0.0.1:4173/tcds/A16WE?model=${model}`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[aria-label="Node connections"]')?.textContent.includes('SA01635LA'),{timeout:30000});
   assert.equal(await page.$eval('#aircraft-model',node=>node.value),model);
   assert.equal(await page.$eval('[aria-label="Reviewed Boeing 737 variants"] button[aria-pressed="true"]',node=>node.textContent),model);
   assert.match(await page.$eval('#family-overview-title',node=>node.parentElement.parentElement.parentElement.innerText),new RegExp(model));
   await page.evaluate(model=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes(`AD 2001-14-05 → ${model}`)).click(),model);
   let evidence=await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText);
   assert.match(evidence,/installation restriction/);assert.match(evidence,/page 2/);
   await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes('Boeing AOM')).click());
   evidence=await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText);
   assert.match(evidence,/not been obtained/);
   await page.evaluate(model=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes(`STC SA01635LA → ${model}`)).click(),model);
   evidence=await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText);
   assert.match(evidence,/Compatibility|compatibility/);assert.match(evidence,/written permission/);assert.match(evidence,/page 1/);
   assert.match(evidence,/second page has not been obtained/);
   await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent==='View cited PDF').click());
   await page.waitForSelector('[role="dialog"] iframe',{timeout:15000});
   assert.match(await page.$eval('[role="dialog"] iframe',node=>node.src),/#page=1$/);await page.keyboard.press('Escape');
   await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  // Legacy FAA series URLs resolve to the same canonical selected model.
  await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-800%20Series',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#aircraft-model');assert.equal(await page.$eval('#aircraft-model',node=>node.value),'737-800');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',models:['737-700','737-800'],checks:['canonical model URL','legacy Series URL','AD installation restriction','unobtained reference boundary','STC permissions/compatibility','archived STC PDF page','mobile width']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
