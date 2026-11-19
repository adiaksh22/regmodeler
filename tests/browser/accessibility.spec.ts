import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
import type {Page,TestInfo} from '@playwright/test';
import {test,expect,openMap} from './fixtures';

// Synthetic fixtures only. Incomplete axe results are retained for human review,
// not counted as passing contrast or assistive-technology checks.
async function audit(page:Page,testInfo:TestInfo,name:string){
 const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze();
 const path=testInfo.outputPath(`${name}-accessibility.json`);
 await writeFile(path,JSON.stringify({violations:result.violations,incomplete:result.incomplete,passes:result.passes.map(rule=>rule.id)},null,2));
 await testInfo.attach(`${name}-accessibility`,{path,contentType:'application/json'});
 const summarize=(rules:typeof result.violations)=>rules.map(rule=>({id:rule.id,nodes:rule.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));
 expect(summarize(result.violations),name).toEqual([]);
 expect(summarize(result.incomplete.filter(rule=>rule.id==='aria-prohibited-attr')),`${name}: accessible names need valid roles`).toEqual([]);
}

test('accessibility: search and source-change navigation',async({page},testInfo)=>{
 await page.goto('/');await expect(page.locator('#catalog-search')).toBeVisible();
 await audit(page,testInfo,'search');
 await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Source changes',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toBeFocused();
 await audit(page,testInfo,'source-changes');
});

test('accessibility: Boeing family map and evidence inspector',async({page},testInfo)=>{
 await page.goto('/tcds/A16WE?model=737-800');await openMap(page);
 await expect(page.locator('.react-flow__edge')).toHaveCount(41);
 await audit(page,testInfo,'family-map');
 await page.getByRole('button',{name:'Evidence list',exact:true}).click();
 await audit(page,testInfo,'evidence-list');
});

test('accessibility: aircraft configuration and related records',async({page},testInfo)=>{
 await page.goto('/tcds/2A13?model=PA-28-181');
 const editor=page.locator('details').filter({has:page.locator(':scope > summary').filter({hasText:'Aircraft configuration'})});
 await editor.locator('summary').click();await page.getByLabel('Aircraft profile name').fill('Accessibility fixture');
 await page.getByRole('button',{name:'Add STC entry',exact:true}).click();
 await audit(page,testInfo,'profile-editor');
 await page.getByRole('tab',{name:/Related ADs/}).click();
 await audit(page,testInfo,'related-records');
});

test('accessibility: paths, revision history and review coverage',async({page},testInfo)=>{
 await page.goto('/tcds/2A13?model=PA-28-181');
 await page.getByRole('button',{name:'Paths',exact:true}).click();
 await audit(page,testInfo,'paths');
 await page.getByRole('tab',{name:'Revision history',exact:true}).click();
 await expect(page.getByRole('tabpanel')).toContainText('Imported FAA revision history');
 await audit(page,testInfo,'revision-history');
 await page.getByRole('tab',{name:'Review coverage',exact:true}).click();
 await expect(page.getByRole('tabpanel')).toContainText('review');
 await audit(page,testInfo,'review-coverage');
});
