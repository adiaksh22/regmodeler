const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {createClient}=require('@supabase/supabase-js');const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const out=path.join(__dirname,'../.artifacts/source-review');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const client=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const numbers=['2024-10-04','SA09252AC-D','SA09257AC-D','SA4930SW'];
 const result=await client.from('model_graph').select('*').in('source_document_number',numbers);assert.equal(result.error,null);assert.equal(result.data.length,16);
 assert.equal(result.data.filter(r=>!r.path_via).length,5);
 assert.ok(result.data.filter(r=>r.source_document_number==='SA09252AC-D').every(r=>r.model==='PA-28-181'));
 assert.ok(result.data.filter(r=>r.source_document_number==='SA09257AC-D').every(r=>r.model==='PA-28-140'));
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});let phase='AD publication';
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1366,height:900});
  const choose=async fragment=>page.evaluate(t=>{const b=[...document.querySelectorAll('#panel-relationships button')].find(e=>e.textContent.includes(t));if(!b)throw Error('Connection missing');b.click();},fragment);
  await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.body.innerText.includes('AD 2024-10-04'));await choose('AD 2024-10-04');
  const aside='aside[aria-label="Relationship source evidence"]';assert.match(await page.$eval(aside,e=>e.textContent),/bulletin has not been retrieved/);
  const published=await page.$eval(aside,e=>[...e.querySelectorAll('a')].find(a=>a.textContent.includes('Open published original')).href);assert.equal(published,'https://www.govinfo.gov/content/pkg/FR-2024-05-22/pdf/2024-11143.pdf');
  await choose('View cited PDF');await page.waitForSelector('[role="dialog"] iframe');assert.ok((await page.$eval('[role="dialog"] iframe',e=>e.src)).endsWith('#page=4'));await page.keyboard.press('Escape');await page.waitForSelector('[role="dialog"]',{hidden:true});
  await page.$eval(aside,e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(out,'ad-published-original.png')});
  for(const [model,stc,supplement] of [['PA-28-181','SA09252AC-D','891444'],['PA-28-140','SA09257AC-D','891454']]){
   phase=stc;await page.select('#aircraft-model',model);await page.waitForFunction(n=>document.querySelector('#panel-relationships').textContent.includes('STC '+n),{},stc);await choose('STC '+stc);await choose('Explore referenced documents');
   await page.waitForFunction(n=>document.querySelector('#panel-relationships').textContent.includes('S-TEC AFM supplement '+n),{},supplement);await choose('S-TEC AFM supplement '+supplement);
   assert.match(await page.$eval(aside,e=>e.textContent),new RegExp('page 2'));await choose('View cited PDF');await page.waitForSelector('[role="dialog"] iframe');assert.ok((await page.$eval('[role="dialog"] iframe',e=>e.src)).endsWith('#page=2'));await page.keyboard.press('Escape');await page.waitForSelector('[role="dialog"]',{hidden:true});
  }
  await page.$eval(aside,e=>e.scrollIntoView({block:'center'}));await page.screenshot({path:path.join(out,'model-specific-supplement.png')});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['16 published graph rows','five reviewed model scopes','final-publication provenance','cited physical pages','model-specific supplements'],screenshots:out}));
 }catch(e){console.error(JSON.stringify({status:'failed',phase,message:e.message}));process.exitCode=1;}finally{await browser.close();}
})().catch(()=>{console.error('Source review smoke failed');process.exitCode=1;});
