const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];const detailRequests=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.includes('/relationship_applicability_rules'))detailRequests.push(request.url());});
  await page.setViewport({width:1600,height:1100});
  await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[aria-label="Find a relationship node"]');
  await page.type('[aria-label="Find a relationship node"]','2022-03-15');await page.click('[aria-label="Node search results"] button');
  await page.waitForFunction(()=>document.querySelectorAll('.react-flow__node-evidence').length===7&&document.querySelectorAll('.react-flow__edge').length===6);
  assert.match(await page.$eval('[aria-label="Relationship source evidence"] h3',node=>node.textContent),/2022-03-15/);
  assert.equal(detailRequests.length,0,'Node browsing must not load detailed applicability');
  assert.equal(await page.$$eval('.react-flow__node-evidence svg polygon',nodes=>nodes.length),14);
  const layout=await page.evaluate(()=>{
   const panel=document.querySelector('[aria-label="Relationship source evidence"]').getBoundingClientRect();
   const map=document.querySelector('[aria-label="Interactive relationship node-link diagram"]').getBoundingClientRect();
   const controls=[...document.querySelectorAll('.reg-studio-tools > label')].map(node=>node.getBoundingClientRect().top);
   return {panelLeft:panel.left,mapLeft:map.left,mapWidth:map.width,controls};
  });
  assert.ok(layout.panelLeft<layout.mapLeft);assert.ok(layout.mapWidth>800);
  assert.ok(Math.max(...layout.controls)-Math.min(...layout.controls)<2,'Desktop toolbar must occupy one row');
  await page.$eval('.reg-graph-workspace',node=>node.scrollIntoView({block:'start'}));
  await page.screenshot({path:'.artifacts/network-studio-desktop.png'});
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Compact workspace').click());
  await page.waitForFunction(()=>!document.querySelector('.reg-wide-explorer'));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Expand workspace').click());
  await page.setViewport({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.waitForFunction(()=>{const node=document.querySelector('.react-flow__node.selected')?.getBoundingClientRect();const map=document.querySelector('.reg-network-canvas')?.getBoundingClientRect();return node&&map&&node.left<map.right&&node.right>map.left&&node.top<map.bottom&&node.bottom>map.top;});
  await page.$eval('.reg-network-canvas',node=>node.scrollIntoView({block:'start'}));
  await page.screenshot({path:'.artifacts/network-studio-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['hexagonal nodes','radial focused connections','left evidence panel','wide canvas','single-row desktop toolbar','compact/expand controls','mobile width','focused node visible','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
