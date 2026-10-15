// Uses an isolated temporary Chrome profile; never edits the user's browser data.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createClient}=require('@supabase/supabase-js');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const out=path.join(__dirname,'../.artifacts/boeing-family');fs.mkdirSync(out,{recursive:true});

(async()=>{
 const client=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const [versions,variants,graph,rules]=await Promise.all([
  client.from('tcds_versions').select('id',{count:'exact',head:true}).eq('tcds_number','A16WE'),
  client.from('aircraft_variant_catalog').select('*').eq('tcds_number','A16WE'),
  client.from('model_graph').select('*').eq('tcds_number','A16WE'),
  client.from('relationship_applicability_rules').select('*'),
 ]);
 for(const result of [versions,variants,graph,rules])assert.equal(result.error,null);
 assert.equal(versions.count,57);assert.equal(variants.data.length,7);assert.equal(graph.data.length,18);assert.equal(rules.data.length,16);
 assert.equal(variants.data.find(v=>v.display_name==='737 MAX 10').faa_status,'not_listed_in_current_tcds');
 assert.equal(variants.data.find(v=>v.display_name==='737-800').facts.vmo.evidence_page,23);

 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});let phase='home';
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource:'))errors.push(message.text());});page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  const clickText=async text=>page.evaluate(value=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===value);if(!button)throw Error(`Button missing: ${value}`);button.click();},text);
  await page.setViewport({width:1440,height:1050});await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle0'});
  assert.match(await page.$eval('h1',node=>node.textContent),/connected evidence/i);
  await page.type('#catalog-search','737-8');await clickText('Search');await page.waitForFunction(()=>document.body.innerText.includes('Boeing 737 family'));
  await page.click('a[href*="A16WE"]');await page.waitForFunction(()=>document.body.innerText.includes('737 MAX 8')&&document.body.innerText.includes('182,200 lb'));

  phase='family facts and certification boundary';const body=await page.$eval('body',node=>node.innerText);
  assert.match(body,/57 revisions|Revision history \(57\)/);assert.match(body,/737 MAX 10: not listed in current FAA TCDS/);assert.match(body,/189 seats/);assert.match(body,/41,000 ft/);
  await page.waitForSelector('[aria-label="Interactive relationship node-link diagram"]',{timeout:30000});
  assert.equal(await page.$$eval('.react-flow__node',nodes=>nodes.length),4);
  await page.type('[aria-label="Find a relationship node"]','LEAP-1B');await page.click('[aria-label="Node search results"] button');
  assert.match(await page.$eval('#node-map-status',node=>node.textContent),/direct reviewed connection/);
  assert.match(await page.$eval('[aria-label="Node connections"]',node=>node.textContent),/Approved engine family/);
  await page.screenshot({path:path.join(out,'boeing-node-map.png'),fullPage:true});

  phase='variant switching and cited evidence';await clickText('737 MAX 7');await page.waitForFunction(()=>document.body.innerText.includes('177,000 lb'));
  await page.evaluate(()=>document.querySelector('[aria-label="Node connections"] button')?.click());
  const aside='aside[aria-label="Relationship source evidence"]';await page.waitForSelector(aside);assert.match(await page.$eval(aside,node=>node.textContent),/A16WE|Revision 81/);
  await clickText('View cited PDF');await page.waitForSelector('[role="dialog"] iframe');
  assert.match(await page.$eval('[role="dialog"] iframe',node=>node.src),/#page=(66|67)$/);await page.keyboard.press('Escape');

  phase='structured alternative applicability';await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>document.body.innerText.includes('AD 2022-03-15'),{timeout:30000});await clickText('Paths');
  await page.waitForFunction(()=>document.body.innerText.includes('AD 2022-03-15'));
  await page.evaluate(()=>{const button=[...document.querySelectorAll('#panel-relationships button[aria-pressed]')].find(node=>node.textContent.includes('AD 2022-03-15'));if(!button)throw Error('AD 2022-03-15 path missing');button.click();});
  assert.match(await page.$eval(aside,node=>node.textContent),/G3X Touch path[\s\S]*OR[\s\S]*GI 275 path/);

  phase='mobile';await page.setViewport({width:390,height:844});await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-8',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>document.body.innerText.includes('737 MAX 10: not listed'),{timeout:30000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'boeing-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['57 hosted revisions','7 variant/project records','MAX 10 boundary','page-cited technical facts','default node-link map','shared engine traversal','variant switching','archived TCDS citation','structured OR/AND applicability','mobile layout'],screenshots:out}));
 }catch(error){console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;}finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
