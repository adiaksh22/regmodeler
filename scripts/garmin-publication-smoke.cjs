// Uses an isolated temporary Chrome profile; never edits the user's browser data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const out=path.join(__dirname,'../.artifacts/garmin-publication');fs.mkdirSync(out,{recursive:true});

(async()=>{
 const c=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const numbers=['2024-14-03','2022-03-15','2001-23-17'];
 const rows=await c.from('model_graph').select('*').in('source_document_number',numbers);
 assert.equal(rows.error,null);assert.equal(rows.data.length,26);assert.equal(rows.data.filter(r=>r.relationship_type==='affects_component').length,6);assert.ok(rows.data.every(r=>r.original_source_url?.startsWith('https://www.govinfo.gov/')));
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});let phase='load';
 try{
  const p=await browser.newPage();const errors=[];const leaked=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.postData()?.includes('Garmin publication check'))leaked.push(new URL(r.url()).pathname);});
  const click=async text=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===t);if(!b)throw Error('Button missing: '+t);b.click();},text);
  const fill=async(label,value)=>{const selector=`input[aria-label="${label}"]`;await p.click(selector,{clickCount:3});await p.keyboard.press('Backspace');if(value)await p.type(selector,value);};
  const openEditor=()=>p.evaluate(()=>{const d=[...document.querySelectorAll('details')].find(e=>e.querySelector(':scope > summary')?.textContent.startsWith('Aircraft configuration'));if(!d)throw Error('Profile editor missing');d.open=true;});
  const choose=fragment=>p.evaluate(t=>{const b=[...document.querySelectorAll('#panel-relationships button[aria-pressed]')].find(e=>e.textContent.includes(t));if(!b)throw Error('Connection missing: '+t);b.click();},fragment);
  const searchNode=async text=>{await fill('Find a relationship node',text);await p.evaluate(()=>document.querySelector('[aria-label="Node search results"] button').click());};
  const aside='aside[aria-label="Relationship source evidence"]';
  await p.setViewport({width:1400,height:950});await p.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'networkidle0'});
  await p.waitForFunction(()=>['AD 2024-14-03','AD 2022-03-15','AD 2001-23-17'].every(x=>document.body.innerText.includes(x)));

  phase='reviewed configuration choices';await openEditor();await fill('Aircraft profile name','Garmin publication check');await click('Add equipment entry');
  const options=await p.$$eval('select[aria-label="Equipment item 1"] option',xs=>xs.map(x=>x.textContent));
  assert.ok(options.some(x=>x.includes('GFC 500')));assert.ok(options.some(x=>x.includes('G3X Touch or GI 275')));assert.ok(options.some(x=>x.includes('GNS 430')));
  await p.select('select[aria-label="Equipment item 1"]','GARMIN:GFC500-GSA28-PITCH-TRIM');await p.select('select[aria-label="Equipment installation 1"]','installed');await click('Save and use profile');
  await p.waitForFunction(()=>document.body.innerText.includes('Affected equipment installed'));await choose('AD 2024-14-03');
  assert.match(await p.$eval(aside,e=>e.textContent),/GFC 500.*GSA 28.*software version.*records require review/is);await click('View cited PDF');await p.waitForSelector('[role="dialog"] iframe');assert.ok((await p.$eval('[role="dialog"] iframe',e=>e.src)).endsWith('#page=3'));await p.keyboard.press('Escape');await p.waitForSelector('[role="dialog"]',{hidden:true});

  phase='shared nodes and alternative STCs';await click('Nodes');await p.waitForSelector('.react-flow__node');await p.evaluate(()=>[...document.querySelectorAll('#panel-relationships label')].find(l=>l.textContent.includes('both supported models')).querySelector('input').click());
  await searchNode('GFC 500 with optional');assert.match(await p.$eval('[aria-label="Node connections"]',e=>e.textContent),/AD 2024-14-03.*Affects installed component/s);
  const nodeChoices=await p.$$eval('#panel-relationships select option',xs=>xs.map(x=>x.textContent));assert.equal(nodeChoices.filter(x=>x.includes('GFC 500 with optional')).length,1);
  await searchNode('STC SA01899WI');await p.evaluate(()=>document.querySelector('[aria-label="Node connections"] button').click());assert.match(await p.$eval(aside,e=>e.textContent),/alternative applicability path/i);
  await searchNode('GNS 430 P/N');await p.evaluate(()=>document.querySelector('[aria-label="Node connections"] button').click());await click('View cited PDF');await p.waitForSelector('[role="dialog"] iframe');assert.ok((await p.$eval('[role="dialog"] iframe',e=>e.src)).endsWith('#page=2'));await p.keyboard.press('Escape');await p.waitForSelector('[role="dialog"]',{hidden:true});
  await p.screenshot({path:path.join(out,'garmin-nodes.png'),fullPage:true});

  phase='mobile';await p.setViewport({width:390,height:844});await p.reload({waitUntil:'networkidle0'});await openEditor();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:path.join(out,'garmin-mobile.png'),fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(leaked,[]);
  console.log(JSON.stringify({status:'passed',checks:['26 publication graph rows','official original links','three profile configurations','GFC 500 page 3 citation','canonical shared node','alternative STC path','GNS 430 page 2 citation','mobile layout','no profile upload'],screenshots:out}));
 }catch(e){console.error(JSON.stringify({status:'failed',phase,message:e.message}));process.exitCode=1;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
