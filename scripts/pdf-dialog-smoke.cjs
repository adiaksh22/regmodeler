// Native browser dialog behavior with an isolated, intercepted viewer response.
// Real archived PDF delivery is checked separately by revision82-smoke.cjs.
const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let unavailable=false;
  await page.setRequestInterception(true);
  page.on('request',request=>{
   const url=new URL(request.url());
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'};
   if(url.pathname==='/functions/v1/source-viewer')void request.respond({status:request.method()==='OPTIONS'?204:unavailable?503:200,contentType:'application/json',headers,body:request.method()==='OPTIONS'?'':JSON.stringify({url:url.origin+'/storage/v1/object/sign/modal-fixture.pdf?token=fixture'})});
   else if(url.pathname==='/storage/v1/object/sign/modal-fixture.pdf')void request.respond({status:200,contentType:'text/html',body:'<!doctype html><title>Keyboard fixture</title><button>Inside document</button>'});
   else void request.continue();
  });
  await page.setViewport({width:1280,height:900});
  await page.goto('http://127.0.0.1:4173/tcds/A16WE?model=737-10',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[aria-label="Relationship source evidence"]');
  const open=async()=>{await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='View cited PDF').click());await page.waitForSelector('dialog[open]');};
  const restored=()=>page.evaluate(()=>document.activeElement?.textContent==='View cited PDF');
  await open();
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close PDF');
  assert.equal(await page.evaluate(()=>document.querySelector('dialog').matches(':modal')),true);
  assert.equal(await page.$eval('dialog iframe',node=>new URL(node.src).hash),'#page=67');
  await page.focus('nav a');
  assert.equal(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)),true,'Background links must be inert');
  for(let step=0;step<12;step++){
   await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement===document.body||document.querySelector('dialog').contains(document.activeElement)),true,'Tab must not reach background controls');
  }
  await page.focus('[aria-label="Close PDF"]');await page.keyboard.press('Escape');
  await page.waitForSelector('dialog',{hidden:true});assert.equal(await restored(),true);
  assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await page.setViewport({width:390,height:844});await open();
  assert.ok(await page.$eval('dialog',node=>{const bounds=node.getBoundingClientRect();return bounds.left>=0&&bounds.right<=innerWidth&&bounds.top>=0&&bounds.bottom<=innerHeight;}));
  await page.screenshot({path:'.artifacts/pdf-dialog-mobile.png'});
  await page.click('[aria-label="Close PDF"]');await page.waitForSelector('dialog',{hidden:true});assert.equal(await restored(),true);
  unavailable=true;
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(node=>node.textContent==='View cited PDF').click());
  await page.waitForFunction(()=>document.body.innerText.includes('Use the official source link'));
  assert.equal(await page.$('dialog'),null);assert.ok(await page.$('[aria-label="Relationship source evidence"] a[target="_blank"]'));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['native top-layer modal','initial close focus','inert background','keyboard containment including iframe','Escape restores trigger','scroll restoration','exact page citation','mobile viewport','Close restores trigger','unavailable original guidance','zero browser errors']}));
 }finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',message:error.message}));process.exitCode=1;});
