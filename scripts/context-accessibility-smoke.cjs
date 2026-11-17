// Isolated browser records and public reads only; no FAA import or hosted writes.
const assert=require('node:assert/strict');
const puppeteer=require('../research/legacy/mcp-client/node_modules/puppeteer');
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:4173';
let phase='route heading';
const context='[aria-label="Exploration context"]';
const click=(page,text)=>page.evaluate(text=>{const node=[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);if(!node)throw Error('Missing button: '+text);node.click();},text);
const heading=async(page,title)=>{await page.waitForFunction(title=>document.title===`${title} · RegModeler`&&document.activeElement===document.querySelector('h1'),{},title);};
const settled=page=>page.waitForFunction(()=>document.querySelector('.reg-network-canvas')?.dataset.motion==='settled'&&document.querySelectorAll('.react-flow__edge').length===41);
const within=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
(async()=>{
 const browser=await puppeteer.launch({headless:'new',executablePath:process.env.SMOKE_BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 let page;
 try{
  page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1600,height:1100});
  await page.goto(base,{waitUntil:'domcontentloaded'});await heading(page,'Aircraft search');
  await page.focus('a[href="#main-content"]');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'main-content');
  await page.click('nav a[href="/changelog"]');await heading(page,'FAA source changes');
  await page.focus('[aria-label="Change feed model"]');await page.select('[aria-label="Change feed model"]','737-800');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Change feed model');
  assert.equal(await page.title(),'FAA source changes · RegModeler');
  await page.evaluate(()=>localStorage.setItem('tcds_issues',JSON.stringify([{id:'isolated-accessibility',tcds_number:'2A13',issue_type:'sample',field_name:'revision',table_value:'old',source_value:'new',status:'open'}])));
  await page.reload({waitUntil:'domcontentloaded'});await heading(page,'FAA source changes');
  await page.evaluate(()=>{const summary=[...document.querySelectorAll('summary')].find(node=>node.textContent.includes('Local prototype records'));summary.parentElement.open=true;});
  await page.waitForSelector('select[aria-label="Issue status for 2A13 revision"]');
  await page.select('select[aria-label="Issue status for 2A13 revision"]','resolved');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tcds_issues'))[0].status),'resolved');
  const cdp=await page.createCDPSession();const tree=await cdp.send('Accessibility.getFullAXTree');
  assert.ok(tree.nodes.some(node=>node.role?.value==='combobox'&&node.name?.value==='Issue status for 2A13 revision'));
  phase='model family focus and source context';
  await page.goto(`${base}/tcds/A16WE?model=737-800`,{waitUntil:'domcontentloaded'});await heading(page,'TCDS A16WE');await settled(page);
  assert.match(await page.$eval(context,node=>node.innerText),/Selected aircraft\s+737-800/i);
  assert.match(await page.$eval(context,node=>node.innerText),/Reviewed family models/);
  await page.focus('.reg-graph-help summary');await page.keyboard.press('Enter');
  assert.match(await page.$eval('.reg-graph-help',node=>node.innerText),/Enter or Space/);
  await page.keyboard.press('Enter');assert.equal(await page.$eval('.reg-graph-help',node=>node.open),false);
  await page.focus('#aircraft-model');await page.select('#aircraft-model','737-900ER');
  await page.waitForFunction(()=>document.querySelector('[aria-label="Exploration context"]')?.innerText.includes('737-900ER · TCDS'));
  assert.equal(await page.evaluate(()=>document.activeElement.id),'aircraft-model');
  await page.select('#aircraft-model','737-800');await settled(page);
  const browse='.reg-studio-tools label:nth-child(2) select';
  const max10=await page.$eval(browse,node=>[...node.options].find(option=>option.text==='737-10').value);
  await page.focus(browse);await page.select(browse,max10);
  await page.waitForFunction(()=>document.querySelector('[aria-label="Exploration context"]')?.innerText.includes('Source model: 737-10 · differs from selected aircraft'));
  const text=await page.$eval(context,node=>node.innerText);assert.match(text,/Selected aircraft\s+737-800/i);assert.match(text,/Exploring: 737-10/);assert.match(text,/A16WE · 83 · page/);
  assert.equal(await page.$eval(browse,node=>node===document.activeElement),true);
  await click(page,'Hide source details');assert.match(await page.$eval(context,node=>node.innerText),/details hidden/i);
  await click(page,'Show source details');assert.doesNotMatch(await page.$eval(context,node=>node.innerText),/details hidden/i);
  await click(page,'Back one node');await page.waitForFunction(()=>document.querySelector('[aria-label="Exploration context"]')?.innerText.includes('Exploring: Boeing 737 family'));
  phase='context contrast and focus';
  const contrast=await page.$eval(context,node=>{
   const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number);
   const lum=values=>values.map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);
   const background=lum(rgb(getComputedStyle(node).backgroundColor));
   return [...node.querySelectorAll('dt,dd')].map(element=>{const foreground=lum(rgb(getComputedStyle(element).color));return {text:element.textContent,ratio:(Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05)};});
  });
  assert.ok(contrast.every(item=>item.ratio>=4.5),JSON.stringify(contrast));
  await page.focus('.reg-network-studio nav > button:not([disabled])');assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid');
  await page.$eval('.reg-node-map',node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:'.artifacts/context-desktop.png'});
  phase='list and paths context';
  for(const mode of ['Evidence list','Paths']){await click(page,mode);await page.waitForSelector(context);const text=await page.$eval(context,node=>node.innerText);assert.match(text,/Selected model/);assert.match(text,/737-800 · TCDS/);assert.doesNotMatch(text,/Source model: 737-10/);}
  await click(page,'Node map');await settled(page);
  phase='mobile and enlarged text';
  for(const width of [390,320]){
   await page.setViewport({width,height:900});await page.waitForFunction(()=>document.querySelector('.reg-network-canvas')?.dataset.motion==='settled');
   assert.ok(await within(page),`${width}px horizontal overflow`);
   assert.ok(await page.$eval(context,node=>[...node.querySelectorAll('dt,dd')].every(child=>child.getBoundingClientRect().right<=innerWidth)),`${width}px clipped context`);
  }
  await page.$eval(context,node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:'.artifacts/context-mobile.png'});
  await page.setViewport({width:768,height:1100});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await page.waitForFunction(()=>document.querySelector('.reg-network-canvas')?.dataset.motion==='settled');assert.ok(await within(page),'200% root text horizontal overflow');
  assert.ok(await page.$eval(`${context} dd`,node=>parseFloat(getComputedStyle(node).fontSize)>=26),'Context text must enlarge with the root font');
  await page.$eval(context,node=>node.scrollIntoView({block:'start'}));await page.screenshot({path:'.artifacts/context-enlarged-text.png'});await page.evaluate(()=>document.documentElement.style.fontSize='');
  phase='reduced motion and route recovery';
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  assert.ok(await page.$eval('.reg-network-studio button',node=>getComputedStyle(node).transitionDuration.split(',').every(value=>parseFloat(value)===0)));
  await page.goto(`${base}/not-a-page`,{waitUntil:'domcontentloaded'});await heading(page,'Page not found');
  await page.click('main a[href="/"]');await heading(page,'Aircraft search');
  await page.waitForSelector('a[href^="/tcds/"]');
  assert.ok(await page.$eval('a[href^="/tcds/"]',node=>getComputedStyle(node).transitionDuration.split(',').every(value=>parseFloat(value)===0)));
  await page.goto(`${base}/tcds/ZZ999ZZ999`,{waitUntil:'domcontentloaded'});await heading(page,'TCDS ZZ999ZZ999');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['route heading focus and distinct titles','skip link','filters and model changes preserve focus','legacy status accessible name and save','selected aircraft versus family focus versus citation model','hidden inspector context','Back and list/paths consistency','context solid-background contrast','visible focus','320/390 layouts','200% root text reflow','reduced CSS motion','unknown route recovery','zero page errors']}));
 }catch(error){if(page)await page.screenshot({path:'.artifacts/context-failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;});
