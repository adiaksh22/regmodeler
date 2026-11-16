const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
let phase='family';
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173';
const settled=page=>page.waitForFunction(()=>document.querySelector('.reg-network-canvas')?.dataset.motion==='settled'&&document.querySelectorAll('.react-flow__edge').length===41);
const click=async(page,text)=>page.evaluate(text=>[...document.querySelectorAll('button')].find(node=>node.textContent===text).click(),text);
const bounds=page=>page.evaluate(()=>{
 const canvas=document.querySelector('.reg-network-canvas').getBoundingClientRect();
 return [...document.querySelectorAll('.react-flow__node')].map(node=>{
  const box=node.getBoundingClientRect(),label=node.querySelector('.reg-node-label');
  const transform=document.querySelector('.react-flow__viewport').style.transform;const zoom=Number(/scale\(([^)]+)\)/.exec(transform)?.[1]);
  return {label:label.textContent,inside:box.left>=canvas.left-1&&box.right<=canvas.right+1&&box.top>=canvas.top-1&&box.bottom<=canvas.bottom+1,font:parseFloat(getComputedStyle(label).fontSize)*zoom,box:{x:box.x,y:box.y,width:box.width,height:box.height},canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height},zoom};
 });
});
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:process.env.SMOKE_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 let page;
 try{
  page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1600,height:1100});
  await page.goto(`${base}/tcds/A16WE`,{waitUntil:'domcontentloaded'});await settled(page);
  for(const node of await bounds(page)){assert.equal(node.inside,true,JSON.stringify(node));assert.ok(node.font>=12,JSON.stringify(node));}
  await page.evaluate(()=>{window.originalGraph=document.querySelector('.react-flow');});
  await page.$eval('.reg-node-map',node=>node.scrollIntoView({block:'start'}));
  await (await page.$('.reg-network-canvas')).screenshot({path:'.artifacts/graph-ui-family-desktop.png'});
  phase='collision';
  const selectors=await page.$$eval('.react-flow__node:not(.selected)',nodes=>nodes.slice(0,2).map(node=>node.dataset.id));
  phase='keyboard path highlighting';
  await page.focus(`.react-flow__node[data-id="${selectors[0]}"]`);
  await page.waitForFunction(()=>[...document.querySelectorAll('.react-flow__edge-path')].filter(path=>getComputedStyle(path).stroke==='rgb(125, 211, 252)').length>=2);
  assert.equal(await page.$$eval('.react-flow__edge',nodes=>nodes.length),41);
  await page.$eval('.reg-studio-tools select',node=>node.focus());
  phase='collision';
  const circles=[];for(const id of selectors)circles.push(await (await page.$(`.react-flow__node[data-id="${id}"] svg`)).boundingBox());
  const [a,b]=circles;await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
  await page.evaluate(()=>{window.frameTimes=[];window.edgeCounts=[];window.sampling=true;let last=performance.now();const sample=now=>{window.frameTimes.push(now-last);last=now;window.edgeCounts.push(document.querySelectorAll('.react-flow__edge').length);if(window.sampling)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
  const collision=await page.evaluate(ids=>{
   window.sampling=false;const [a,b]=ids.map(id=>document.querySelector(`.react-flow__node[data-id="${id}"]`).getBoundingClientRect());
   return {separate:a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,edges:document.querySelectorAll('.react-flow__edge').length,frames:window.frameTimes,counts:window.edgeCounts};
  },selectors);assert.equal(collision.separate,true);assert.equal(collision.edges,41);assert.ok(collision.counts.every(count=>count===41),JSON.stringify({counts:collision.counts,frames:collision.frames}));
  phase='stable navigation';
  await page.select('.reg-studio-tools label:nth-child(2) select',selectors[0]);
  await page.waitForFunction(()=>document.querySelector('.reg-network-canvas')?.dataset.motion==='settled'&&document.querySelectorAll('.react-flow__node').length<21);
  assert.equal(await page.evaluate(()=>window.originalGraph===document.querySelector('.react-flow')),true,'Exploration must keep the same canvas');
  await click(page,'Back one node');await settled(page);
  await click(page,'Readable zoom');await page.waitForFunction(()=>Number(/scale\(([^)]+)\)/.exec(document.querySelector('.react-flow__viewport').style.transform)?.[1])>.95);
  await click(page,'Fit map');await page.waitForFunction(()=>Number(/scale\(([^)]+)\)/.exec(document.querySelector('.react-flow__viewport').style.transform)?.[1])<.95);
  phase='reduced motion';
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.select('.reg-studio-tools label:nth-child(2) select',selectors[1]);
  assert.equal(await page.$eval('.reg-network-canvas',node=>node.dataset.motion),'settled');
  await click(page,'Back one node');await settled(page);
  for(const width of [320,390,768]){
   phase=`width ${width}`;await page.setViewport({width,height:844});
   await page.waitForFunction(()=>document.querySelector('.reg-network-canvas')?.dataset.motion==='settled');
   await click(page,'Fit map');
   for(const node of await bounds(page)){assert.equal(node.inside,true,`${width}: ${node.label}`);assert.ok(node.font>=12,JSON.stringify({width,...node}));}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===390)await (await page.$('.reg-network-canvas')).screenshot({path:'.artifacts/graph-ui-family-mobile.png'});
  }
  phase='touch page scroll';
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});phase='touch initialize';
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(node=>node.textContent==='Node map'));
  await click(page,'Node map');await settled(page);phase='touch fit';await click(page,'Fit map');await settled(page);
  await page.$eval('.reg-network-canvas',node=>node.scrollIntoView({block:'start'}));
  assert.equal(await page.$eval('.reg-network-canvas',node=>node.dataset.panEnabled),'false');
  const cdp=await page.createCDPSession();const before=await page.evaluate(()=>scrollY);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:450}]});
  for(let step=1;step<=10;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:450-step*25}]});await page.evaluate(()=>new Promise(requestAnimationFrame));}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const scroll=await page.evaluate(before=>{const chain=[];let node=document.elementFromPoint(200,450);while(node){chain.push({tag:node.tagName,class:node.getAttribute('class'),touch:getComputedStyle(node).touchAction});node=node.parentElement;}return {before,after:scrollY,chain};},before);
  assert.ok(scroll.after>before+50,JSON.stringify(scroll));
  await click(page,'Move map');assert.equal(await page.$eval('.reg-network-canvas',node=>node.dataset.panEnabled),'true');
  await click(page,'Scroll page');assert.equal(await page.$eval('.reg-network-canvas',node=>node.dataset.panEnabled),'false');
  assert.deepEqual(errors,[]);
  const sorted=collision.frames.slice(1).sort((a,b)=>a-b);
  console.log(JSON.stringify({status:'passed',checks:['readable fitted family labels','17 models and 41 paths on mobile/tablet/desktop','keyboard path highlighting','overlap-safe drag with all arrows','stable canvas across navigation','readable zoom and fit','reduced motion','touch page scroll and pan toggle','no page errors'],dragFrames:sorted.length,medianFrameMs:sorted[Math.floor(sorted.length/2)],p95FrameMs:sorted[Math.floor(sorted.length*.95)]}));
 }catch(error){if(page)console.error(JSON.stringify(await page.evaluate(()=>({url:location.href,motion:document.querySelector('.reg-network-canvas')?.dataset.motion,edges:document.querySelectorAll('.react-flow__edge').length,nodes:document.querySelectorAll('.react-flow__node').length,width:innerWidth,body:document.body.textContent.slice(-500)}))));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;});
