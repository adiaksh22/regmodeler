// Isolated browser regression for audit A01–A05. Reads published data only.
const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173';
let phase='initial';
const click=(page,text)=>page.evaluate(text=>{const node=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);if(!node)throw Error('Missing button: '+text);node.click();},text);
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:process.env.SMOKE_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.setViewport({width:1600,height:1000});
  phase='all model facts';await page.goto(base+'/tcds/A16WE?model=737-100%20Series',{waitUntil:'domcontentloaded'});await page.waitForSelector('.react-flow__edge');
  const detailed={'737-700':'737-700','737-800':'737-800','737-900ER':'737-900ER','737-7':'737 MAX 7','737-8':'737 MAX 8','737-9':'737 MAX 9','737-10':'737 MAX 10'};
  const models=await page.$$eval('#aircraft-model option',nodes=>nodes.map(node=>node.value));assert.equal(models.length,17);
  for(const model of models){
   await page.select('#aircraft-model',model);
   const summary=await page.$eval('[aria-labelledby="family-overview-title"]',node=>({heading:node.querySelector('h3')?.textContent,text:node.textContent}));
   if(detailed[model])assert.equal(summary.heading,detailed[model]);
   else{assert.equal(summary.heading,undefined);assert.ok(summary.text.includes('Detailed technical facts have not been reviewed for '+model));}
  }
  phase='model-bound applicability';await page.select('#aircraft-model','737-8');await click(page,'Show all nodes');
  const selectAD=()=>page.evaluate(()=>{const node=[...document.querySelectorAll('[aria-label="Node connections"] button[aria-pressed]')].find(node=>node.textContent.includes('2021-09-08')&&node.textContent.includes('Conditional applicability'));if(!node)throw Error('AD connection missing');node.click();});
  await selectAD();await page.waitForSelector('[aria-label="Structured applicability logic"]');
  await page.select('#aircraft-model','737-100 Series');assert.equal(await page.$('[aria-label="Structured applicability logic"]'),null);
  assert.match(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.textContent),/Model context: 737-100 Series/);
  phase='error and retry';let fail=true;let requests=0;
  await page.setRequestInterception(true);page.on('request',request=>{if(request.url().includes('/rest/v1/relationship_applicability_rules')){requests++;if(fail){void request.respond({status:503,contentType:'application/json',body:'{"message":"simulated read failure"}'});return;}}void request.continue();});
  await page.select('#aircraft-model','737-8');await click(page,'Show all nodes');await selectAD();
  await page.waitForFunction(()=>document.querySelector('[aria-label="Relationship source evidence"] [role="alert"]')?.textContent.includes('could not be loaded'));
  assert.ok(requests>0);assert.equal(await page.$('[aria-label="Structured applicability logic"]'),null);
  const panel=await page.$eval('[aria-label="Relationship source evidence"]',node=>node.textContent);assert.ok(!panel.includes('has not been imported'));assert.ok(panel.includes('Open FAA record'));
  fail=false;await click(page,'Retry detailed evidence');await page.waitForSelector('[aria-label="Structured applicability logic"]');assert.equal(await page.$('[aria-label="Relationship source evidence"] [role="alert"]'),null);
  phase='model search';await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForSelector('a[href="/tcds/A16WE"]');await page.type('#catalog-search','737-800');await page.click('button[type="submit"]');
  await page.waitForSelector('a[href="/tcds/A16WE?model=737-800"]');await page.$eval('a[href="/tcds/A16WE?model=737-800"]',node=>node.click());await page.waitForSelector('#aircraft-model');assert.equal(await page.$eval('#aircraft-model',node=>node.value),'737-800');
  phase='corrupt legacy storage';
  for(const [key,path] of [['tcds_cross_references','/tcds/2A13'],['tcds_revisions','/tcds/2A13'],['tcds_issues','/changelog'],['tcds_change_log_entries','/changelog']])for(const raw of ['{broken','[null]']){
   const isolated=await browser.newPage();isolated.on('pageerror',error=>errors.push(error.message));await isolated.evaluateOnNewDocument(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await isolated.goto(base+path,{waitUntil:'domcontentloaded'});
   await isolated.waitForFunction(()=>document.body.textContent.includes('Some personal browser records could not be read or saved'));
   await isolated.waitForSelector(path.startsWith('/tcds')?'.react-flow__edge':'[aria-label="Shared source change feed"]');
   assert.equal(await isolated.evaluate(key=>localStorage.getItem(key),key),raw);assert.ok(await isolated.$('nav[aria-label="Primary navigation"]'));await isolated.close();
  }
  phase='blocked storage';const denied=await browser.newPage();denied.on('pageerror',error=>errors.push(error.message));await denied.evaluateOnNewDocument(()=>{Storage.prototype.getItem=()=>{throw Error('Storage denied');};});await denied.goto(base+'/tcds/2A13',{waitUntil:'domcontentloaded'});try{await denied.waitForSelector('.react-flow__edge');}catch{throw Error(JSON.stringify({body:await denied.$eval('body',node=>node.textContent.slice(0,1800)),errors}));}assert.match(await denied.$eval('body',node=>node.textContent),/Existing data was preserved/);await denied.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['17 model summaries never substitute facts','model changes remove stale AD rules','evidence failure is explicit','retry restores actual conditions','737-800 search preserves model','malformed and wrong-shape legacy records preserved','shared pages survive denied storage','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;});
