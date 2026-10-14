const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const out=path.join(__dirname,'../.artifacts/graph');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});let phase='load';
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const click=async text=>page.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===t);if(!b)throw new Error('Missing button '+t);b.click();},text);
  await page.setViewport({width:1440,height:1000});await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-140',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.body.innerText.includes('STC SA01941LA'));await click('Nodes');await page.waitForSelector('.react-flow__node');
  phase='shared nodes';await page.evaluate(()=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Show shared relationships')).querySelector('input').click());
  await page.waitForFunction(()=>[...document.querySelectorAll('.react-flow__node')].some(n=>n.textContent.includes('PA-28-181')));
  assert.equal(await page.$$eval('.react-flow__node',nodes=>nodes.filter(n=>n.textContent.includes('STC SA4236WE')).length),1,'Shared certificate must be one node');
  const scope=await page.evaluate(()=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Browse node')).querySelector('select').outerHTML);assert.match(scope,/STC SA01941LA/);
  await page.evaluate(()=>{const s=[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Browse node')).querySelector('select');s.value=[...s.options].find(o=>o.text==='STC SA01941LA').value;s.dispatchEvent(new Event('change',{bubbles:true}));});
  await new Promise(r=>setTimeout(r,400));
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button')].find(b=>b.textContent.includes('PA-28-140')).click());
  assert.match(await page.$eval('aside[aria-label="Relationship source evidence"]',e=>e.textContent),/Cited attachment: SA01941LA_AML.pdf/);
  phase='attachment PDF';await click('View cited PDF');await page.waitForSelector('[role="dialog"] iframe');
  const src=await page.$eval('[role="dialog"] iframe',e=>e.src);assert.ok(new URL(src).pathname.includes('/FAA/ATTACHMENT/reviewed/'));assert.ok(src.endsWith('#page=1'));
  await page.keyboard.press('Escape');await page.waitForSelector('[role="dialog"]',{hidden:true});
  phase='drag node';const node=await page.evaluate(()=>{const e=[...document.querySelectorAll('.react-flow__node')].find(n=>n.textContent.includes('STC SA01941LA'));return {id:e.getAttribute('data-id'),transform:e.style.transform};});const element=await page.$(`.react-flow__node[data-id="${node.id}"]`);await element.evaluate(e=>e.scrollIntoView({block:'center'}));const box=await element.boundingBox();
  assert.ok(box&&box.x>0&&box.x+box.width<1440,'Focused node must be visible for dragging');if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+55,box.y+box.height/2+35,{steps:8});await page.mouse.up();assert.notEqual(await element.evaluate(e=>e.style.transform),node.transform);}
  await page.$eval('[aria-label="Interactive relationship nodes"]',e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(out,'nodes-desktop.png')});
  phase='review queue';await page.click('#tab-review');await page.waitForFunction(()=>document.body.innerText.includes('reviewed model connections')&&!document.body.innerText.includes('Loading review coverage'));
  assert.ok(await page.$$eval('#panel-review li',e=>e.length)>0);await page.evaluate(()=>{const s=document.querySelector('#panel-review select');s.value='reviewed';s.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelector('#panel-review').textContent.includes('SA01941LA'));
  assert.ok(await page.$$eval('#panel-review li',e=>e.length)>=5,'Reviewed coverage must include the previously verified model connections');
  await page.setViewport({width:390,height:844});await page.$eval('#panel-review',e=>e.scrollIntoView());await page.screenshot({path:path.join(out,'review-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Review queue must not overflow mobile');
  phase='mobile nodes';await page.click('#tab-relationships');await page.$eval('[aria-label="Interactive relationship nodes"]',e=>e.scrollIntoView());await page.screenshot({path:path.join(out,'nodes-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Node controls must not overflow mobile');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['node dragging','shared identities','node traversal','cited AML PDF','review queue','mobile layout','no browser errors'],screenshots:out}));
 }catch(e){console.error(JSON.stringify({status:'failed',phase,message:e.message}));process.exitCode=1;}finally{await browser.close();}
})();
