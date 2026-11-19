// Read-only configured-app journey. An isolated, loopback-only extension sets
// actual browser tab zoom; CSS zoom, device scale and pinch are not substitutes.
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium} from '@playwright/test';

const base=process.env.SMOKE_BASE_URL??'http://127.0.0.1:5173';
if(!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(base))throw Error('Use an explicitly local application URL');
const root=resolve('.artifacts/browser-zoom');await mkdir(root,{recursive:true});
const run=await mkdtemp(join(root,'run-')),extension=join(run,'extension');await mkdir(extension);
await writeFile(join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'RegModeler isolated zoom test',version:'1.0',host_permissions:[`${base}/*`],background:{service_worker:'background.js'}}));
await writeFile(join(extension,'background.js'),'chrome.runtime.onInstalled.addListener(() => {});');
const results=[],errors=[];let context;let phase='launch';
try{
 context=await chromium.launchPersistentContext(join(run,'profile'),{channel:'chromium',headless:true,viewport:null,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--window-size=1440,1000']});
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);
 const capture=async name=>{
  // Capture the physical surface: a CSS-sized screenshot can crop at tab zoom.
  const {data}=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
  await writeFile(join(run,`${name}.png`),Buffer.from(data,'base64'));
 };
 const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${phase}: page must reflow`);
 const zoom=async factor=>{
  const actual=await worker.evaluate(async({factor,base})=>{
   const tabs=await chrome.tabs.query({url:`${base}/*`});
   if(tabs.length!==1)throw Error('Expected exactly one local test tab');
   await chrome.tabs.setZoomSettings(tabs[0].id,{mode:'automatic',scope:'per-tab'});
   await chrome.tabs.setZoom(tabs[0].id,factor);return chrome.tabs.getZoom(tabs[0].id);
  },{factor,base});
  assert.ok(Math.abs(actual-factor)<1e-6,'Browser must confirm the requested zoom factor');return actual;
 };
 for(const [name,path]of[['search','/'],['piper','/tcds/2A13?model=PA-28-181'],['boeing','/tcds/A16WE?model=737-800'],['changes','/changelog']]){
  phase=name;await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded'});await page.locator('h1').waitFor();await zoom(1);
  if(name==='search')await page.locator('a[href^="/tcds/"]').first().waitFor();
  if(name==='piper'||name==='boeing')await page.locator('.reg-network-canvas[data-motion="settled"]').waitFor();
  const baseline=await page.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio}));
  for(const factor of [1,2,4]){
   phase=`${name} ${factor*100}%`;await zoom(factor);
   await page.waitForFunction(({baseline,factor})=>Math.abs(innerWidth-baseline.width/factor)<=2&&Math.abs(devicePixelRatio-baseline.dpr*factor)<.05,{baseline,factor});
   if(name==='piper'||name==='boeing')await page.locator('.reg-network-canvas[data-motion="settled"]').waitFor();
   const metrics=await page.evaluate(()=>({width:innerWidth,content:document.documentElement.scrollWidth,dpr:devicePixelRatio}));
   await capture(`${name}-${factor*100}`);
   assert.ok(metrics.content<=metrics.width+1,`${phase}: page overflow ${JSON.stringify(metrics)}`);
   await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Explore',exact:true}).focus();
   assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Explore');
   results.push({page:name,zoom:factor,...metrics});
  }
  if(name==='piper'){
   const editor=page.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:'Aircraft configuration'})});
   await editor.locator('summary').click();await page.getByLabel('Aircraft profile name').fill('Isolated zoom draft');
   await page.getByRole('button',{name:'Save and use profile',exact:true}).click();
   assert.match(await editor.innerText(),/Profile saved in this browser/);
   await fits();await capture('piper-profile-400');
  }
  if(name==='boeing'){
   await page.getByRole('button',{name:'Evidence list',exact:true}).click();
   await page.getByRole('button',{name:'Node map',exact:true}).click();
   await page.locator('.reg-network-canvas[data-motion="settled"]').waitFor();
   await page.getByRole('button',{name:'Readable zoom',exact:true}).click();
   await page.getByRole('button',{name:'Fit map',exact:true}).click();
   await page.locator('.reg-network-canvas[data-motion="settled"]').waitFor();await fits();await capture('boeing-map-controls-400');
  }
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',run,results,checks:['actual tab zoom readback plus CSS-width/DPR confirmation','100/200/400 percent page reflow','keyboard primary navigation','profile save at400 percent','graph/list and camera controls at400 percent','no page errors']}));
}catch(error){console.error(JSON.stringify({status:'failed',phase,message:error.message,run}));process.exitCode=1;}
finally{if(context)await context.close();await writeFile(join(run,'report.json'),JSON.stringify({phase,passed:!process.exitCode,results,errors},null,2));}
