const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1440,height:1000});
  await page.goto('http://127.0.0.1:4173/changelog',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Source check health"]')?.textContent.includes('scope unconfirmed'),{timeout:30000});
  await page.select('[aria-label="Change feed model"]','PA-28-181');await page.select('[aria-label="Change feed source type"]','STC');
  await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Source check health"] li').length===1,{timeout:20000});
  const health=await page.$eval('[aria-label="Source check health"]',node=>node.innerText);
  assert.match(health,/Checked with scope gaps/);assert.match(health,/857 returned/);assert.match(health,/849 exact-match candidates/);assert.match(health,/8 scope unconfirmed/);
  assert.match(health,/not been treated as missing from its index/);assert.doesNotMatch(health,/Latest check failed/);
  await page.screenshot({path:'.artifacts/quarantine-desktop.png',fullPage:true});
  await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>[...document.querySelectorAll('summary')].some(node=>node.textContent.includes('Source check health and monitoring limits')),{timeout:30000});
  await page.evaluate(()=>[...document.querySelectorAll('summary')].find(node=>node.textContent.includes('Source check health and monitoring limits')).click());
  assert.match(await page.$eval('[aria-label="Source check health"]',node=>node.innerText),/8 scope unconfirmed/);
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await (await page.$('[aria-label="Source check health"]')).screenshot({path:'.artifacts/quarantine-mobile.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['successful check with explicit gaps','857=849+8 coverage','family/model/type filters','unconfirmed is not missing','TCDS health disclosure','mobile width','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
