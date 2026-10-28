const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1440,height:1050});
  await page.goto('http://127.0.0.1:4173/changelog',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[aria-label="Source check health"] li',{timeout:30000});
  assert.equal(await page.$$eval('[aria-label="Source check health"] li',nodes=>nodes.length),6);
  const health=await page.$eval('[aria-label="Source check health"]',node=>node.innerText);
  assert.match(health,/Piper PA-28 · STC index/);assert.match(health,/Latest check failed/);
  assert.match(health,/TCDS PDF bytes are verified during reconciliation/);
  await page.select('[aria-label="Change feed model"]','737-800');
  await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Source check health"] li').length===3,{timeout:20000});
  assert.doesNotMatch(await page.$eval('[aria-label="Source check health"]',node=>node.innerText),/Piper PA-28/);
  const links=await page.$$eval('a',nodes=>nodes.filter(node=>node.textContent==='Explore 737-800 evidence').map(node=>node.getAttribute('href')));
  assert.ok(links.every(link=>link==='/tcds/A16WE?model=737-800'));
  await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-800',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[aria-label="Reviewed Boeing 737 variants"]',{timeout:30000});
  await page.click('#tab-history');
  await page.waitForFunction(()=>document.querySelector('#tab-history')?.textContent.includes('('),{timeout:20000});
  assert.ok(await page.$$eval('#panel-history ol li',nodes=>nodes.length)>0,'Revision history finishes after its loading-state render');
  await page.evaluate(()=>[...document.querySelectorAll('summary')].find(node=>node.textContent.includes('Source check health and monitoring limits')).click());
  assert.equal(await page.$$eval('[aria-label="Source check health"] li',nodes=>nodes.length),3);
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await (await page.$('[aria-label="Source check health"]')).screenshot({path:'.artifacts/monitoring-health-mobile.png'});
  await page.screenshot({path:'.artifacts/monitoring-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['six named sources','failed PA-28 STC check visible','Boeing model filter','correct certificate links','completed lazy history','TCDS health panel','mobile layout','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
