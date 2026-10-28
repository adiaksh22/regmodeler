// Uses an isolated headless browser against the hosted-data production preview.
const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const model of ['737-8','737-9']){
   await page.setViewport({width:1440,height:1050});
   await page.goto(`http://127.0.0.1:4173/tcds/A16WE?model=${model}`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[aria-label="Node connections"]')?.textContent.includes('AD 2021-09-08'),{timeout:30000});
   await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes('AD 2021-09-08')&&button.textContent.includes('Conditionally applies to'))?.click());
   // Select the incoming AD link by its target model when graph wording differs.
   await page.evaluate(model=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes(`AD 2021-09-08 → ${model}`))?.click(),model);
   await page.waitForSelector('[aria-label="Structured applicability logic"]',{timeout:15000});
   const text=await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText);
   assert.match(text,/7399/);assert.match(text,/8082/);assert.match(text,/2021-04-09/);
   assert.match(text,/Reviewed applicability conditions/i);assert.doesNotMatch(text,/either group/);
   assert.equal(await page.$eval('[aria-label="Relationship source evidence"] a[href*="govinfo.gov"]',node=>node.href),'https://www.govinfo.gov/content/pkg/FR-2021-04-30/pdf/2021-09221.pdf');
   await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(button=>button.textContent.includes('P6 panel'))?.click());
   assert.match(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText),/\(g\)\(1\)|P6 panel/);
   await page.setViewport({width:390,height:844});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',models:['737-8','737-9'],checks:['AD traversal','combined model/line/certificate conditions','official publication link','shared P6 component','mobile width']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
