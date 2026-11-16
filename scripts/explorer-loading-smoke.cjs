// Published-data reads only. Failures and truncated responses are simulated in
// this isolated browser; no FAA requests or hosted writes are performed.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const artifacts=path.join(__dirname,'../.artifacts');fs.mkdirSync(artifacts,{recursive:true});
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Content-Range','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info,prefer,range,range-unit','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json'};
const click=(page,text)=>page.evaluate(text=>{const node=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);if(!node)throw Error('Missing button '+text);node.click();},text);
let phase='start';
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:process.env.SMOKE_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];const reads=[];const graphResults=[];const failedReads=[];
  page.on('requestfailed',request=>failedReads.push({name:new URL(request.url()).pathname.split('/').at(-1),error:request.failure()?.errorText}));
  page.on('pageerror',error=>errors.push(error.message));await page.setViewport({width:1500,height:1000});
  page.on('request',request=>{const url=new URL(request.url());if(request.method()!=='OPTIONS'&&url.pathname.includes('/rest/v1/'))reads.push({name:url.pathname.split('/').at(-1),model:url.searchParams.get('model'),limit:url.searchParams.get('limit'),offset:url.searchParams.get('offset')});});
  page.on('response',async response=>{if(new URL(response.url()).pathname.endsWith('/model_graph')&&response.status()===200){try{graphResults.push(await response.json());}catch{}}});
  phase='scoped cold load';await page.goto(base+'/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});await page.waitForSelector('.react-flow__edge');
  const graphReads=()=>reads.filter(read=>read.name==='model_graph');
  assert.equal(graphReads().length,1,'Wait for the catalog identity before loading graph data');assert.equal(graphReads()[0].model,'eq.PA-28-181');assert.equal(graphReads()[0].limit,'250');
  phase='reference traversal';const rows=graphResults.flat();const source=rows.find(row=>row.direction==='incoming'&&rows.some(reference=>reference.path_via&&reference.source_entity_id===row.source_entity_id));assert.ok(source,'A reviewed source with references must be available');
  await page.evaluate(number=>[...document.querySelectorAll('[aria-label="Node connections"] button[aria-pressed]')].find(node=>node.textContent.includes(number)).click(),source.source_document_number);
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent==='Explore referenced documents'));
  const detailsBefore=reads.filter(read=>read.name==='relationship_applicability_rules').length;
  await click(page,'Explore referenced documents');phase='reference node focus';await page.waitForFunction(id=>document.querySelector('.react-flow__node.selected')?.dataset.id===id,{},source.source_entity_id);
  assert.match(await page.$eval('[aria-label="Focused graph node"] h3',node=>node.textContent),new RegExp(source.source_document_number.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  phase='reference keyboard focus';await page.waitForFunction(id=>document.activeElement?.getAttribute('data-id')===id,{},source.source_entity_id);
  assert.equal(reads.filter(read=>read.name==='relationship_applicability_rules').length,detailsBefore,'Traversal must not request detailed applicability');
  phase='cited archived source';await click(page,'View cited PDF');await page.waitForSelector('iframe[title="Archived source PDF"]');assert.equal(await page.$eval('iframe[title="Archived source PDF"]',node=>new URL(node.src).hash),'#page='+source.evidence_page);await page.click('[aria-label="Close PDF"]');
  await page.$eval('.reg-graph-workspace',node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(artifacts,'explorer-references-desktop.png')});
  await click(page,'Back one node');assert.equal(await page.$('[aria-label="Focused graph node"]'),null);
  phase='reference traversal in paths and list';
  for(const [mode,view] of [['Paths','graph'],['Evidence list','list']]){
   await click(page,mode);
   await page.evaluate(({number,view})=>[...document.querySelectorAll(`[aria-label="PA-28-181 relationship ${view}"] button`)].find(node=>node.textContent.includes(number)).click(),{number:source.source_document_number,view});
   await click(page,'Explore referenced documents');assert.ok(await page.$(`[aria-label="PA-28-181 relationship ${view}"]`));
   assert.match(await page.$eval('#panel-relationships h2',node=>node.textContent),new RegExp(source.source_document_number));await click(page,'Back to PA-28-181');
  }
  await click(page,'Node map');await page.waitForSelector('.react-flow__edge');assert.equal(await page.$('[aria-label="Focused graph node"]'),null,'An already handled traversal must not replay when the map remounts');
  phase='scope cache';await page.select('#aircraft-model','PA-28-140');await page.waitForFunction(()=>document.querySelector('[aria-label="Relationship source evidence"]')?.textContent.includes('Model context: PA-28-140'));
  const afterOther=graphReads().length;await page.select('#aircraft-model','PA-28-181');await page.waitForFunction(()=>document.querySelector('[aria-label="Relationship source evidence"]')?.textContent.includes('Model context: PA-28-181'));assert.equal(graphReads().length,afterOther);
  const widerResponse=page.waitForResponse(response=>response.request().method()==='GET'&&new URL(response.url()).pathname.endsWith('/model_graph')&&!new URL(response.url()).searchParams.has('model'));
  await page.evaluate(()=>[...document.querySelectorAll('label')].find(node=>node.textContent.includes('Show shared relationships')).querySelector('input').click());
  const familyRows=(await (await widerResponse).json()).length;
  await page.waitForFunction(()=>document.querySelector('[aria-label="Node connections"]')?.textContent.includes('PA-28-140'));
  assert.equal(graphReads().at(-1).model,null);assert.ok(graphReads().every(read=>read.limit==='250'));
  assert.equal(reads.filter(read=>read.name==='aircraft_variant_catalog').length,1);assert.equal(reads.filter(read=>read.name==='source_monitoring_coverage').length,1);
  phase='independent sections';let mode='hold-variants';let held;await page.setRequestInterception(true);
  page.on('request',request=>{
   if(request.method()==='OPTIONS'){void request.respond({status:204,headers:{...cors,'Access-Control-Allow-Headers':request.headers()['access-control-request-headers']||cors['Access-Control-Allow-Headers']}});return;}
   const name=new URL(request.url()).pathname.split('/').at(-1);
   if(name==='aircraft_variant_catalog'&&mode==='hold-variants'){held=request;return;}
   if((name==='source_monitoring_coverage'&&mode==='hold-variants')||(name==='model_graph'&&mode==='graph-fail')||(name==='tcds_catalog'&&mode==='catalog-fail')){void request.respond({status:503,headers:cors,body:'{}'});return;}
   if(name==='model_graph'&&mode==='truncated'){void request.respond({status:200,headers:{...cors,'Content-Range':'0-0/25'},body:JSON.stringify(rows.slice(0,1))});return;}
   if(name==='model_graph'&&mode==='oversized'){void request.respond({status:200,headers:{...cors,'Content-Range':'*/2001'},body:'[]'});return;}
   void request.continue();
  });
  await page.goto(base+'/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});await page.waitForSelector('.react-flow__edge');assert.ok(held);assert.match(await page.$eval('body',node=>node.textContent),/Loading technical profiles/);
  await held.respond({status:503,headers:cors,body:'{}'});await page.waitForFunction(()=>document.querySelector('[aria-label="Aircraft data loading status"]')?.textContent.includes('Retry technical profiles'));
  const beforeRetry=graphReads().length;mode='normal';await click(page,'Retry technical profiles');await click(page,'Retry source check health');
  phase='secondary section retries';try{await page.waitForFunction(()=>!document.querySelector('[aria-label="Aircraft data loading status"]')?.textContent.trim(),{timeout:15000});}catch{throw Error(JSON.stringify({status:await page.$eval('[aria-label="Aircraft data loading status"]',node=>node.textContent),failedReads,reads:reads.slice(-8)}));}
  assert.equal(graphReads().length,beforeRetry);assert.ok(await page.$('.react-flow__edge'));
  phase='dated refresh failure';mode='graph-fail';await click(page,'Reload catalog');try{await page.waitForFunction(()=>document.querySelector('[aria-label="Aircraft data loading status"]')?.textContent.includes('Showing data loaded'),{timeout:15000});}catch{throw Error(JSON.stringify({body:(await page.$eval('[aria-label="Aircraft data explorer"]',node=>node.textContent)).slice(0,2700),reads:reads.slice(-10)}));}
  try{await page.waitForSelector('.react-flow__edge',{timeout:2000});}catch{throw Error(JSON.stringify(await page.evaluate(()=>({status:document.querySelector('[aria-label="Aircraft data loading status"]')?.textContent,nodes:document.querySelectorAll('.react-flow__node').length,edges:document.querySelectorAll('.react-flow__edge').length,canvas:!!document.querySelector('.react-flow'),activeTab:document.querySelector('[role="tab"][aria-selected="true"]')?.textContent,source:document.querySelector('[aria-label="Relationship source evidence"]')?.textContent.slice(0,220)}))));}mode='normal';await click(page,'Retry reviewed relationships');await page.waitForFunction(()=>!document.querySelector('[aria-label="Aircraft data loading status"]')?.textContent.includes('Retry'));
  phase='catalog failure retains last record';mode='catalog-fail';await click(page,'Reload catalog');await page.waitForFunction(()=>document.body.textContent.includes('Showing the last loaded catalog record'));assert.equal(await page.$eval('#aircraft-model',node=>node.value),'PA-28-181');await page.waitForSelector('.react-flow__edge');
  phase='incomplete graph rejected';mode='truncated';await page.goto(base+'/tcds/2A13?model=PA-28-181',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.textContent.includes('response was incomplete'));assert.equal(await page.$('.react-flow__edge'),null);assert.doesNotMatch(await page.$eval('body',node=>node.textContent),/No reviewed relationships are available/);
  phase='oversized family rejected';mode='oversized';await page.goto(base+'/tcds/A16WE',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.body.textContent.includes('too many connections'));assert.equal(await page.$('.react-flow__edge'),null);await page.waitForSelector('[aria-labelledby="family-overview-title"]');
  phase='recover graph';mode='normal';await click(page,'Retry reviewed relationships');await page.waitForSelector('.react-flow__edge');
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.$eval('[aria-label="Aircraft data explorer"]',node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(artifacts,'explorer-scope-mobile.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',modelRows:rows.length,familyRows,checks:['selected-model bounded query','reference action focuses source with keyboard focus and Back','no details call from traversal','actual cited archive opens at selected page','model/family cache reuse','slow and failed secondary sections preserve graph','section retry isolation','dated retained data on failed refresh','last catalog record survives outage','incomplete and oversized reads rejected','retry restores graph','mobile width','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;});
