const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];const requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/rest/v1/rpc/'))requests.push(request.url().split('/').at(-1));});
  await page.setViewport({width:1440,height:1050});
  await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-800',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Node connections"]')?.textContent.includes('ST01635LA'),{timeout:30000});
  const family=await page.$eval('[aria-labelledby="family-overview-title"]',node=>node.innerText);
  assert.match(family,/Reviewed TCDS revision: \d+/);assert.doesNotMatch(family,/current FAA TCDS Revision 81|Listed in current A16WE/);
  assert.match(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText),/Reviewed connection/);
  assert.equal(requests.filter(name=>name==='source_quality_details').length,0,'Quality notes stay lazy');
  await page.click('#tab-related');await page.select('[aria-label="Related document type"]','STC');
  async function find(number){
   const input=await page.$('[aria-label="Filter related records"]');await input.click({clickCount:3});await input.press('Backspace');await input.type(number);
   await page.waitForFunction(number=>{
    const rows=document.querySelectorAll('#panel-related button[aria-pressed]');
    return rows.length===1&&rows[0].textContent.includes(number);
   },{timeout:20000},number);
   return page.$eval('#panel-related button[aria-pressed]',node=>node.innerText);
  }
  const deferred=await find('SA04009NY');assert.match(deferred,/Review deferred/);assert.match(deferred,/Record identity mismatch/);
  const before=requests.filter(name=>name==='source_quality_details').length;
  assert.equal(before,0,'Listing flags do not request per-record notes');
  await page.click('#panel-related button[aria-pressed]');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Source-quality findings"]')?.textContent.includes('ST04009NY'),{timeout:15000});
  const detail=await page.$eval('[aria-label="Related record details"]',node=>node.innerText);
  assert.match(detail,/Primary PDF saved/);assert.match(detail,/Retrieval does not establish document completeness/);
  const incomplete=await find('SA01635LA');assert.match(incomplete,/Reviewed connection/);assert.match(incomplete,/Incomplete original/);
  const complete=await find('ST01635LA');assert.match(complete,/Reviewed connection/);assert.doesNotMatch(complete,/Incomplete original|Record identity mismatch/);
  await page.click('#tab-review');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Source review coverage"]')?.getAttribute('aria-busy')==='false',{timeout:20000});
  assert.match(await page.$eval('#panel-review li',node=>node.innerText),/Metadata candidate/);
  await page.select('#panel-review select','deferred');
  const input=await page.$('#panel-review input');await input.type('SA04009NY');
  await page.waitForFunction(()=>document.querySelector('#panel-review li')?.textContent.includes('SA04009NY'),{timeout:20000});
  const queue=await page.$eval('#panel-review li',node=>node.innerText);assert.match(queue,/Review deferred/);assert.match(queue,/Record identity mismatch/);
  await page.evaluate(()=>[...document.querySelectorAll('#panel-review li button')].find(button=>button.textContent.includes('Source review notes')).click());
  await page.waitForSelector('#panel-review [aria-label="Source-quality findings"]');
  await page.screenshot({path:'.artifacts/source-status-desktop.png',fullPage:true});
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'.artifacts/source-status-mobile.png',fullPage:true});
  assert.ok(requests.includes('search_related_documents_with_review'));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['actual variant evidence revision','graph review scope','metadata candidates','deferred identity mismatch','reviewed incomplete source','separate complete record','lazy source notes','bounded enriched related page','queue findings','mobile width','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
