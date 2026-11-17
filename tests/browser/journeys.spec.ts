import {test,expect,openMap,versionId} from './fixtures';

test('model-first search, route focus and manual keyboard tabs',async({page})=>{
 await page.goto('/');await expect(page).toHaveTitle('Aircraft search · RegModeler');await expect(page.getByRole('heading',{level:1})).toBeFocused();
 await page.getByRole('textbox',{name:'Aircraft model or TCDS number'}).fill('PA-28-181');await page.getByRole('button',{name:'Search',exact:true}).click();
 await expect(page.locator('a[href^="/tcds/"]')).toHaveCount(1);await page.locator('a[href^="/tcds/"]').click();
 await expect(page).toHaveTitle('TCDS 2A13 · RegModeler');await expect(page.getByRole('heading',{level:1})).toBeFocused();await expect(page.locator('#aircraft-model')).toHaveValue('PA-28-181');
 await page.getByRole('tab',{name:'Relationships',exact:true}).focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Revision history'})).toBeFocused();await expect(page.getByRole('tab',{name:'Relationships',exact:true})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('Enter');await expect(page.getByRole('tabpanel')).toContainText('Imported FAA revision history');await expect(page.getByRole('tabpanel')).toContainText('Current FAA revision');
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Source changes',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toBeFocused();
 await expect(page).toHaveTitle('FAA source changes · RegModeler');await page.getByLabel('Change feed model').focus();await page.getByLabel('Change feed model').selectOption('737-800');await expect(page.getByLabel('Change feed model')).toBeFocused();
 await expect(page.getByLabel('Shared source change feed')).toContainText('No recorded events');
});

test('full family network, readable layout and cross-model citation context',async({page})=>{
 await page.goto('/tcds/A16WE?model=737-800');await openMap(page);
 await expect(page.locator('.react-flow__node')).toHaveCount(21);await expect(page.locator('.react-flow__edge')).toHaveCount(41);
 const bounds=await page.locator('.reg-network-canvas').evaluate(canvas=>{
  const box=canvas.getBoundingClientRect();return [...canvas.querySelectorAll('.react-flow__node')].every(node=>{const n=node.getBoundingClientRect();return n.left>=box.left-1&&n.right<=box.right+1&&n.top>=box.top-1&&n.bottom<=box.bottom+1;});
 });expect(bounds).toBe(true);
 const arrows=await page.locator('.react-flow__edge [data-target-node]').evaluateAll(groups=>groups.map(group=>{
  const path=group.querySelector<SVGPathElement>('.react-flow__edge-path')!,matrix=path.getScreenCTM()!;
  const boundary=(id:string,at:number)=>{
   const circle=document.querySelector<SVGCircleElement>(`.react-flow__node[data-id="${CSS.escape(id)}"] circle`)!;
   const box=circle.getBoundingClientRect(),point=path.getPointAtLength(at),screen=new DOMPoint(point.x,point.y).matrixTransform(matrix);
   return Math.abs((Math.hypot(screen.x-box.x-box.width/2,screen.y-box.y-box.height/2)-box.width/2)/Math.hypot(matrix.a,matrix.b)-2);
  };
  return {source:boundary(group.getAttribute('data-source-node')!,0),target:boundary(group.getAttribute('data-target-node')!,path.getTotalLength()),tip:group.querySelector('marker')!.getAttribute('refX')};
 }));
 expect(arrows).toHaveLength(41);for(const arrow of arrows){expect(arrow.source).toBeLessThan(.15);expect(arrow.target).toBeLessThan(.15);expect(arrow.tip).toBe('9');}
 const browse=page.locator('.reg-studio-tools select').nth(1);
 await browse.selectOption({label:'737-10'});await expect(page.getByLabel('Exploration context')).toContainText('Exploring: 737-10');
 await expect(page.getByLabel('Exploration context')).toContainText('737-800 · TCDS A16WE');await expect(page.getByLabel('Exploration context')).toContainText('Source model: 737-10 · differs from selected aircraft');
 await page.getByRole('button',{name:'Hide source details',exact:true}).click();await expect(page.getByLabel('Exploration context')).toContainText('details hidden');
 await page.getByRole('button',{name:'Back one node',exact:true}).click();await expect(page.getByLabel('Exploration context')).toContainText('Exploring: Boeing 737 family');
 await page.emulateMedia({reducedMotion:'reduce'});await browse.selectOption({label:'737-700'});await expect(page.locator('.reg-network-canvas')).toHaveAttribute('data-motion','settled');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('scoped reads are cached; secondary outage does not erase graph; retry is isolated',async({page,api})=>{
 api.fail.add('aircraft_variant_catalog');await page.goto('/tcds/2A13?model=PA-28-181');await openMap(page);
 await expect(page.locator('.react-flow__edge')).toHaveCount(3);await expect(page.getByRole('button',{name:'Retry technical profiles',exact:true})).toBeVisible();
 const graphReads=api.reads.filter(read=>read.path==='model_graph');expect(graphReads).toHaveLength(1);expect(graphReads[0].query.get('model')).toBe('eq.PA-28-181');
 api.fail.delete('aircraft_variant_catalog');await page.getByRole('button',{name:'Retry technical profiles',exact:true}).click();await expect(page.getByRole('button',{name:'Retry technical profiles',exact:true})).toHaveCount(0);
 expect(api.reads.filter(read=>read.path==='model_graph')).toHaveLength(1);
 await page.locator('#aircraft-model').focus();await page.locator('#aircraft-model').selectOption('PA-28-140');await expect(page.getByLabel('Exploration context')).toContainText('PA-28-140 · TCDS');await expect(page.locator('#aircraft-model')).toBeFocused();
 await expect(page.locator('.react-flow__edge')).toHaveCount(3);await page.locator('#aircraft-model').selectOption('PA-28-181');await expect(page.locator('.react-flow__edge')).toHaveCount(3);
 expect(api.reads.filter(read=>read.path==='model_graph')).toHaveLength(2);
});

test('incomplete graph responses never appear as complete and retry restores them',async({page,api})=>{
 api.incompleteGraph=true;await page.goto('/tcds/2A13?model=PA-28-181');await page.getByRole('button',{name:'Node map',exact:true}).click();
 await expect(page.getByLabel('Aircraft data loading status')).toContainText('response was incomplete');await expect(page.locator('.react-flow__edge')).toHaveCount(0);
 api.incompleteGraph=false;await page.getByRole('button',{name:'Retry reviewed relationships',exact:true}).click();await expect(page.locator('.react-flow__edge')).toHaveCount(3);
});

test('partial drafts survive routes, reload and model switches; relevance uses saved profile',async({page})=>{
 await page.goto('/tcds/2A13?model=PA-28-140');const editor=page.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:'Aircraft configuration'})});
 await editor.locator('summary').click();const name=page.getByLabel('Aircraft profile name');await name.fill('CI private first draft');await page.getByLabel('Aircraft serial number').fill('28-');
 await page.getByRole('button',{name:'Add STC entry',exact:true}).click();await expect(editor).toContainText('Draft backed up in this tab');
 expect(await page.evaluate(()=>localStorage.getItem('regmodeler_aircraft_profiles_v1'))).toBeNull();
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Source changes',exact:true}).click();await page.goBack();await expect(name).toHaveValue('CI private first draft');
 await page.reload();await expect(name).toHaveValue('CI private first draft');await expect(page.getByLabel('Aircraft serial number')).toHaveValue('28-');
 await page.locator('#aircraft-model').selectOption('PA-28-181');await page.locator('#aircraft-model').selectOption('PA-28-140');await expect(name).toHaveValue('CI private first draft');
 await page.getByRole('button',{name:'Save and use profile',exact:true}).click();await expect(editor).toContainText('Check each STC');
 await page.getByRole('button',{name:'Remove entry 1',exact:true}).click();await page.getByLabel('Aircraft serial number').fill('28-20001');await page.getByRole('button',{name:'Save and use profile',exact:true}).click();
 await expect(editor).toContainText('Profile saved in this browser');await name.fill('CI private unsaved change');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('regmodeler_aircraft_profiles_v1')!).profiles[0].name)).toBe('CI private first draft');
});

test('personal links validate, navigate, merge, remove and undo without FAA writes',async({page,api})=>{
 await page.goto('/tcds/2A13');const section=page.getByLabel('Personal cross-references');const input=page.getByLabel('TCDS number to link');
 const before=()=>api.reads.filter(read=>read.path==='tcds_catalog').length;
 await expect.poll(before).toBe(1);
 for(const value of ['2a13','bad value']){const count=before();await input.fill(value);await section.getByRole('button',{name:'Link',exact:true}).click();await expect(input).toHaveAttribute('aria-invalid','true');expect(before()).toBe(count);}
 await input.fill('a16we');const count=before();await section.getByRole('button',{name:'Link',exact:true}).click();await expect(section.getByRole('link',{name:'TCDS A16WE'})).toBeVisible();expect(before()).toBe(count+1);
 await section.getByRole('link',{name:'TCDS A16WE'}).click();await expect(page.getByRole('heading',{level:1})).toBeFocused();await section.getByRole('link',{name:'TCDS 2A13'}).click();
 await page.evaluate(()=>{const key='tcds_cross_references',groups=JSON.parse(localStorage.getItem(key)!);groups.push({group_id:'fixture-second',members:['E7CE','P19NE'],method:'manual',created_at:'2026-11-16T00:00:00Z',updated_at:'2026-11-16T00:00:00Z'});localStorage.setItem(key,JSON.stringify(groups));});
 await section.getByRole('button',{name:'Reload personal links',exact:true}).click();await input.fill('E7CE');await expect(section).toContainText('also joins its personal group: P19NE');
 await section.getByRole('button',{name:'Join groups and link',exact:true}).click();await expect(section.getByRole('link')).toHaveCount(3);
 await section.getByRole('button',{name:'Remove P19NE from personal group',exact:true}).click();await expect(section.getByRole('link')).toHaveCount(2);await section.getByRole('button',{name:'Undo removal',exact:true}).click();await expect(section.getByRole('link')).toHaveCount(3);
});

test('native PDF dialog traps focus, restores trigger and explains signer failure',async({page,api})=>{
 await page.goto('/tcds/2A13?model=PA-28-181');await page.getByRole('button',{name:'View cited PDF',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Archived source PDF'});await expect(dialog).toBeVisible();await expect(page.getByRole('button',{name:'Close PDF',exact:true})).toBeFocused();
 await expect(dialog.locator('iframe')).toHaveAttribute('src',/#page=1$/);expect(api.reads.find(read=>read.path==='source-viewer')?.body).toEqual({versionId});
 // Native dialogs may yield to browser chrome (document.body), but background app controls stay inert.
 await page.getByRole('navigation',{name:'Primary navigation'}).locator('a').first().evaluate(node=>(node as HTMLElement).focus());
 expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
 for(let i=0;i<6;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement===document.body||!!document.activeElement?.closest('dialog'))).toBe(true);}
 await page.getByRole('button',{name:'Close PDF',exact:true}).focus();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'View cited PDF',exact:true})).toBeFocused();
 api.fail.add('source-viewer');await page.getByRole('button',{name:'View cited PDF',exact:true}).click();await expect(page.getByLabel('Relationship source evidence')).toContainText('archived PDF is unavailable');
});

test('corrupt personal records are preserved and blocked tab storage keeps drafts during navigation',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('tcds_cross_references','{broken fixture');
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(this===sessionStorage)throw Error('Fixture quota');return original.call(this,key,value);};
 });
 await page.goto('/tcds/2A13?model=PA-28-140');await openMap(page);await expect(page.locator('.react-flow__edge')).toHaveCount(3);
 await expect(page.getByLabel('Personal cross-references')).toContainText('Existing browser data has been preserved');await expect(page.getByLabel('TCDS number to link')).toBeDisabled();
 await page.locator('summary').filter({hasText:'Aircraft configuration'}).click();await page.getByLabel('Aircraft profile name').fill('CI private memory draft');
 await expect(page.getByLabel('Aircraft data explorer')).toContainText('Draft backup is unavailable');
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Source changes',exact:true}).click();await page.goBack();
 await expect(page.getByLabel('Aircraft profile name')).toHaveValue('CI private memory draft');expect(await page.evaluate(()=>localStorage.getItem('tcds_cross_references'))).toBe('{broken fixture');
});
