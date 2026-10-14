// Uses an isolated temporary Chrome profile; never edits the user's browser data.
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const out=path.join(__dirname,'../.artifacts/profiles');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await puppeteer.launch({headless:'new',executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const page=await browser.newPage();const errors=[];const leaked=[];
    let acceptDialogs=true;
    page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>void (acceptDialogs?d.accept():d.dismiss()));
    page.on('request',r=>{if(r.postData()?.includes('Browser test aircraft'))leaked.push(new URL(r.url()).pathname);});
    const click=async text=>page.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===t);if(!b)throw new Error('Button missing: '+t);b.click();},text);
    const fill=async(label,value)=>{const selector=`input[aria-label="${label}"]`;await page.click(selector,{clickCount:3});await page.keyboard.press('Backspace');await page.type(selector,value);};
    const openEditor=async()=>page.evaluate(()=>{const d=[...document.querySelectorAll('details')].find(e=>e.querySelector(':scope > summary')?.textContent.startsWith('Aircraft configuration'));d.open=true;});
    await page.setViewport({width:1280,height:900});
    await page.goto('http://127.0.0.1:4173/tcds/2A13?model=PA-28-140',{waitUntil:'networkidle0'});
    await page.waitForFunction(()=>document.body.innerText.includes('AD 2020-24-05'));
    await openEditor();await fill('Aircraft profile name','Browser test aircraft');await click('Save and use profile');
    await page.waitForFunction(()=>document.body.innerText.includes('Serial number needs review'));
    await fill('Aircraft profile name','Browser test aircraft draft');acceptDialogs=false;await page.select('#aircraft-model','PA-28-181');
    assert.equal(await page.$eval('#aircraft-model',e=>e.value),'PA-28-140');assert.equal(await page.$eval('input[aria-label="Aircraft profile name"]',e=>e.value),'Browser test aircraft draft');
    acceptDialogs=true;await fill('Aircraft profile name','Browser test aircraft');
    await fill('Aircraft serial number','28-20001');await click('Add STC entry');await fill('STC number 1','sa2230ce');await page.select('select[aria-label="STC installation 1"]','installed');
    assert.match(await page.evaluate(()=>document.body.innerText),/Unsaved edits/);
    assert.match(await page.evaluate(()=>document.body.innerText),/Serial number needs review/);
    await click('Save and use profile');await page.waitForFunction(()=>document.body.innerText.includes('Within reviewed serial range'));
    assert.match(await page.evaluate(()=>document.body.innerText),/Installed — user reported/);
    await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>document.body.innerText.includes('Within reviewed serial range'));await openEditor();
    await page.screenshot({path:path.join(out,'profile-desktop.png'),fullPage:true});
    await fill('Aircraft serial number','28-26947');await click('Save and use profile');await page.waitForFunction(()=>document.body.innerText.includes('Outside reviewed serial ranges'));
    await page.evaluate(()=>[...document.querySelectorAll('#panel-relationships input[type="checkbox"]')][0].click());
    assert.equal(await page.$$eval('#panel-relationships button',buttons=>buttons.some(b=>b.textContent.includes('AD 2020-24-05'))),false);
    await page.click('#tab-related');await page.waitForFunction(()=>document.body.innerText.includes('with current FAA status'));
    await fill('Filter related records','2020-24-05');
    assert.match(await page.evaluate(()=>document.body.innerText),/Outside reviewed serial ranges/);
    await page.evaluate(()=>[...document.querySelectorAll('#panel-related label')].find(l=>l.textContent.includes('Hide records')).querySelector('input').click());
    assert.match(await page.evaluate(()=>document.body.innerText),/0 source records/);
    await fill('Filter related records','');assert.ok(await page.$$eval('#panel-related button[aria-pressed]',e=>e.length)>0,'Unknown candidates must remain visible');
    await page.select('#aircraft-model','PA-28-181');await openEditor();await fill('Aircraft profile name','Browser test aircraft 181');await click('Save and use profile');
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('regmodeler_aircraft_profiles_v1')));assert.equal(saved.profiles.length,2);assert.equal(saved.profiles.find(p=>p.model==='PA-28-140').serial,'28-26947');
    await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});await openEditor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'profile-mobile.png'),fullPage:true});
    // An external tab change must not be overwritten by this stale editor.
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('regmodeler_aircraft_profiles_v1'));s.profiles[0].name='Changed in another tab';localStorage.setItem('regmodeler_aircraft_profiles_v1',JSON.stringify(s));});
    await fill('Aircraft profile name','Browser test aircraft modified');await click('Save and use profile');assert.match(await page.evaluate(()=>document.body.innerText),/Saved profiles changed/);
    await click('Reload saved profiles');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('regmodeler_aircraft_profiles_v1')).profiles[0].name),'Changed in another tab');
    await click('Delete saved profile');const remaining=await page.evaluate(()=>JSON.parse(localStorage.getItem('regmodeler_aircraft_profiles_v1')));
    assert.equal(remaining.profiles.length,1);assert.equal(remaining.profiles[0].model,'PA-28-140');assert.equal(remaining.activeIds['PA-28-181'],undefined);
    await page.evaluate(()=>localStorage.setItem('regmodeler_aircraft_profiles_v1','{corrupt'));
    await page.reload({waitUntil:'networkidle0'});await openEditor();assert.equal(await page.$$eval('button',buttons=>buttons.find(b=>b.textContent==='Save and use profile').disabled),true);
    assert.equal(await page.evaluate(()=>localStorage.getItem('regmodeler_aircraft_profiles_v1')),'{corrupt');
    assert.match(await page.evaluate(()=>document.body.innerText),/Existing browser data has been preserved/);
    assert.deepEqual(errors,[]);assert.deepEqual(leaked,[]);
    console.log('Profile browser checks passed: unknowns, draft/save separation, serial bounds, STC reporting, reload, model isolation, filters, mobile layout, concurrent edits and corrupt-storage preservation.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
