// Uses an isolated temporary Chrome profile; never edits the user's browser data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const out=path.join(__dirname,'../.artifacts/equipment-review');fs.mkdirSync(out,{recursive:true});

(async()=>{
 const c=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const numbers=['2005-01-19','2006-03-08','2005-25-08','2006-12-07'];
 const rows=await c.from('model_graph').select('*').in('source_document_number',numbers);
 assert.equal(rows.error,null);assert.equal(rows.data.length,26);assert.equal(rows.data.filter(r=>r.relationship_type==='affects_component').length,7);
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});let phase='load';
 try{
  const p=await browser.newPage();const errors=[];const leaked=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.postData()?.includes('Equipment browser check'))leaked.push(new URL(r.url()).pathname);});
  const click=async text=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===t);if(!b)throw Error('Button missing: '+t);b.click();},text);
  const fill=async(label,value)=>{const selector=`input[aria-label="${label}"]`;await p.click(selector,{clickCount:3});await p.keyboard.press('Backspace');if(value)await p.type(selector,value);};
  const openEditor=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('details')].find(e=>e.querySelector(':scope > summary')?.textContent.startsWith('Aircraft configuration'));if(!d)throw Error('Profile editor missing');d.open=true;});
  const choose=fragment=>p.evaluate(t=>{const b=[...document.querySelectorAll('#panel-relationships button[aria-pressed]')].find(e=>e.textContent.includes(t));if(!b)throw Error('Connection missing: '+t);b.click();},fragment);
  const aside='aside[aria-label="Relationship source evidence"]';
  await p.setViewport({width:1400,height:950});
  await p.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>document.body.innerText.includes('AD 2005-01-19')&&document.body.innerText.includes('AD 2005-25-08'));

  phase='model-specific equipment options';await openEditor();await fill('Aircraft profile name','Equipment browser check 181');await click('Add equipment entry');
  const options181=await p.$$eval('select[aria-label="Equipment item 1"] option',xs=>xs.map(x=>x.textContent));
  assert.ok(options181.some(x=>x.includes('Garmin GTX')));assert.ok(options181.some(x=>x.includes('Shadin ADC-2000')));assert.ok(!options181.some(x=>x.includes('Lycoming')));
  await p.select('select[aria-label="Equipment item 1"]','GARMIN:GTX33-33D-330-330D');await p.select('select[aria-label="Equipment installation 1"]','installed');await click('Save and use profile');
  await p.waitForFunction(()=>document.body.innerText.includes('Affected equipment installed'));
  await choose('AD 2005-01-19');assert.match(await p.$eval(aside,e=>e.textContent),/Affected equipment installed.*user reported/s);
  assert.match(await p.$eval(aside,e=>e.textContent),/software version.*records require review/is);

  phase='unknown and outside behavior';await p.select('select[aria-label="Equipment installation 1"]','not_installed');await click('Save and use profile');await p.waitForFunction(()=>document.body.innerText.includes('Equipment not installed'));
  await p.evaluate(()=>[...document.querySelectorAll('#panel-relationships label')].find(l=>l.textContent.includes('reported equipment scope')).querySelector('input').click());
  assert.equal(await p.$$eval('#panel-relationships button[aria-pressed]',(buttons)=>buttons.some(b=>b.textContent.includes('AD 2005-01-19'))),false);
  await p.evaluate(()=>[...document.querySelectorAll('#panel-relationships label')].find(l=>l.textContent.includes('reported equipment scope')).querySelector('input').click());

  phase='shared component node and cited page';await click('Nodes');await p.waitForSelector('.react-flow__node');
  await p.evaluate(()=>[...document.querySelectorAll('#panel-relationships label')].find(l=>l.textContent.includes('both supported models')).querySelector('input').click());
  const nodeChoices=await p.$$eval('#panel-relationships select option',xs=>xs.map(x=>x.textContent));assert.ok(nodeChoices.includes('PA-28-140'));assert.ok(nodeChoices.includes('PA-28-181'));assert.equal(nodeChoices.filter(x=>x.includes('Garmin GTX')).length,1);
  await fill('Find a relationship node','Garmin GTX');await p.evaluate(()=>document.querySelector('[aria-label="Node search results"] button').click());
  const connections=await p.$eval('[aria-label="Node connections"]',e=>e.textContent);assert.match(connections,/AD 2005-01-19/);assert.match(connections,/Affects installed component/);
  await p.evaluate(()=>document.querySelector('[aria-label="Node connections"] button').click());await click('View cited PDF');await p.waitForSelector('[role="dialog"] iframe');
  assert.ok((await p.$eval('[role="dialog"] iframe',e=>e.src)).endsWith('#page=5'));await p.keyboard.press('Escape');await p.waitForSelector('[role="dialog"]',{hidden:true});
  await p.screenshot({path:path.join(out,'shared-component.png'),fullPage:true});

  phase='second model and mobile';await p.select('#aircraft-model','PA-28-140');await p.waitForFunction(()=>document.querySelector('#aircraft-model')?.value==='PA-28-140'&&document.body.innerText.includes('AD 2006-12-07'));await openEditor();await fill('Aircraft profile name','Equipment browser check 140');await click('Add equipment entry');
  const options140=await p.$$eval('select[aria-label="Equipment item 1"] option',xs=>xs.map(x=>x.textContent));assert.ok(options140.some(x=>x.includes('ECi AEL65102')));assert.ok(!options140.some(x=>x.includes('Shadin ADC-2000')));
  await p.setViewport({width:390,height:844});await p.reload({waitUntil:'networkidle0'});await openEditor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'equipment-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(leaked,[]);
  console.log(JSON.stringify({status:'passed',checks:['26 batch graph rows','7 component paths','model-specific profile choices','installed/not-installed relevance','outside filter','shared component node','page 5 citation','mobile layout','no profile upload'],screenshots:out}));
 }catch(e){console.error(JSON.stringify({status:'failed',phase,message:e.message}));process.exitCode=1;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
