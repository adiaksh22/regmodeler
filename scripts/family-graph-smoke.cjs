const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1600,height:1100});
  await page.goto('http://127.0.0.1:4173/tcds/A16WE',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelectorAll('.react-flow__edge').length===41);
  const models=await page.$$eval('.react-flow__node',nodes=>nodes.filter(node=>node.textContent.includes('Aircraft model')).map(node=>node.textContent));
  const aliases={'737-700 Series':'737-700','737-800 Series':'737-800','737-900ER Series':'737-900ER'};
  assert.equal(models.length,17);for(const model of require('../apps/worker/src/boeing-revision82.json').models)assert.ok(models.some(label=>label.endsWith(aliases[model]??model)),model);
  assert.match(await page.$eval('[aria-label="Focused graph node"]',node=>node.textContent),/41 reviewed family and certification paths/);
  const geometry=()=>page.$$eval('.react-flow__edge [data-target-node]',edges=>edges.map(group=>{
   const path=group.querySelector('.react-flow__edge-path');const matrix=path.getScreenCTM();
   const boundary=(id,at)=>{
    const circle=document.querySelector(`.react-flow__node[data-id="${CSS.escape(id)}"] circle`);
    const bounds=circle.getBoundingClientRect();const point=path.getPointAtLength(at);const screen=new DOMPoint(point.x,point.y).matrixTransform(matrix);
    const zoom=Math.hypot(matrix.a,matrix.b);const distance=Math.hypot(screen.x-bounds.x-bounds.width/2,screen.y-bounds.y-bounds.height/2);
    return Math.abs((distance-bounds.width/2)/zoom-2);
   };
   const marker=group.querySelector('marker');
   return {sourceError:boundary(group.dataset.sourceNode,0),targetError:boundary(group.dataset.targetNode,path.getTotalLength()),tipAligned:marker.getAttribute('refX')==='9'};
  }));
  for(const edge of await geometry()){assert.ok(edge.sourceError<.15,JSON.stringify(edge));assert.ok(edge.targetError<.15,JSON.stringify(edge));assert.equal(edge.tipAligned,true);}
  await page.$eval('.reg-graph-workspace',node=>node.scrollIntoView({block:'start'}));
  await page.screenshot({path:'.artifacts/boeing-family-network.png'});
  const symbol=await page.$('.react-flow__node:not(.selected) svg');const bounds=await symbol.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+70,bounds.y+bounds.height/2+40,{steps:8});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelectorAll('.react-flow__edge').length===41);
  for(const edge of await geometry()){assert.ok(edge.sourceError<.15);assert.ok(edge.targetError<.15);}
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Node connections"] button[aria-pressed]')].find(node=>node.textContent.includes('Covered by')).click());
  assert.match(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.textContent),/TCDS A16WE/);
  const original=await page.$$eval('.reg-studio-tools select',nodes=>[...nodes[1].options].find(option=>option.textContent==='737-100 Series').value);
  await page.select('.reg-studio-tools label:nth-child(2) select',original);
  await page.waitForFunction(()=>document.querySelector('[aria-label="Focused graph node"] h3')?.textContent==='737-100 Series');
  assert.match(await page.$eval('[aria-label="Relationship source evidence"]',node=>node.textContent),/82.*page 1/);
  await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Relationship source evidence"] button')].find(node=>node.textContent==='View cited PDF').click());
  await page.waitForSelector('iframe[title="Archived source PDF"]');assert.match(await page.$eval('iframe[title="Archived source PDF"]',node=>node.src),/#page=1$/);
  await page.click('[aria-label="Close PDF"]');
  await page.setViewport({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['17 TCDS-listed models by default','41 family/certificate/engine paths','arrows terminate at visible circle boundaries','marker tip alignment','endpoints track dragged nodes','page-cited certificate evidence','737-100 page-1 archived citation','mobile width','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
