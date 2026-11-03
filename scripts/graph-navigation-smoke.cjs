const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1440,height:1050});await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[aria-label="Find a relationship node"]',{timeout:30000});
  await page.type('[aria-label="Find a relationship node"]','2022-03-15');await page.click('[aria-label="Node search results"] button');
  await page.waitForSelector('[aria-label="Focused graph node"]');
  const focused=await page.$eval('[aria-label="Focused graph node"] h3',node=>node.innerText);assert.match(focused,/2022-03-15/);
  assert.equal(await page.$eval('[aria-label="Find a relationship node"]',node=>node.value),'');
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(node=>node.textContent.startsWith('Explore ')&&!node.textContent.includes('PA-28-181')).click());
  assert.notEqual(await page.$eval('[aria-label="Focused graph node"] h3',node=>node.innerText),focused);
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Back one node').click());
  assert.equal(await page.$eval('[aria-label="Focused graph node"] h3',node=>node.innerText),focused);
  await page.click('[aria-label="Node connections"] button[aria-pressed]');
  assert.ok(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.innerText.includes('page')));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Fit map').click());
  await page.screenshot({path:'.artifacts/graph-navigation-desktop.png',fullPage:true});
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.waitForFunction(()=>{const node=document.querySelector('.react-flow__node.selected')?.getBoundingClientRect();const map=document.querySelector('[aria-label="Interactive relationship node-link diagram"]')?.getBoundingClientRect();return node&&map&&node.left<map.right&&node.right>map.left&&node.top<map.bottom&&node.bottom>map.top;},{timeout:10000});
  await (await page.$('.reg-node-map')).screenshot({path:'.artifacts/graph-navigation-mobile.png'});
  await page.select('.reg-node-map select','references');
  assert.equal(await page.$('[aria-label="Focused graph node"]'),null);
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='Back one node').disabled),true);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['search-to-focus','clear focus panel','neighbor traversal','back history','source evidence action','fit map','filter reset','mobile width','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
