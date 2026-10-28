const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];const reads=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.request().method()==='POST'&&response.url().includes('/rpc/search_review_queue'))reads.push(response);});
  const ready=()=>page.waitForFunction(()=>document.querySelector('[aria-label="Source review coverage"]')?.getAttribute('aria-busy')==='false',{timeout:30000});
  const scope='[aria-label="Source review coverage"]';
  await page.setViewport({width:1440,height:1000});
  await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-800',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#tab-review');await page.click('#tab-review');await ready();
  const first=await page.$eval(scope+' li strong',node=>node.textContent);
  assert.equal(await page.$$eval(scope+' li',nodes=>nodes.length),20);
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Review coverage pages"] button')].find(b=>b.textContent==='Next').click());
  await ready();assert.notEqual(await page.$eval(scope+' li strong',node=>node.textContent),first);
  await page.select(scope+' select','reviewed');await ready();
  const selects=await page.$$(scope+' select');await selects[1].select('STC');await ready();
  await page.type(scope+' input','ST01635LA');await ready();
  assert.equal(await page.$$eval(scope+' li',nodes=>nodes.length),1);
  assert.match(await page.$eval(scope+' li strong',node=>node.textContent),/ST01635LA/);
  await page.type(scope+' input','NO-MATCH');await ready();
  assert.match(await page.$eval(scope,node=>node.textContent),/No records match/);
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const firstRequest=reads[0].request();
  const ceiling=await page.evaluate(async(url,key,body)=>{
   const response=await fetch(url,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({...JSON.parse(body),p_limit:10000})});
   return response.json();
  },firstRequest.url(),firstRequest.headers().apikey,firstRequest.postData());
  assert.equal(ceiling.rows.length,50,'Database enforces a page ceiling independently of the UI');
  const metrics=[];
  for(const response of reads){assert.equal(response.status(),200);const body=await response.json();const requested=JSON.parse(response.request().postData()).p_limit;assert.ok(body.rows.length<=Math.min(requested,50));metrics.push({rows:body.rows.length,total:body.total,bytes:(await response.buffer()).length});}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',requests:metrics,checks:['bounded pages','server filters and search','empty results','mobile width','no browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
