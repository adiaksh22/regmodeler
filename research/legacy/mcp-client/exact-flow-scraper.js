const puppeteer = require('puppeteer');
const fs = require('fs');

const testTcds = [
  'ATC 42 Textron Lycoming', 'P19NE', 'E7CE', 'TC 653', 'A14SO', 'E4IN', 'E5NE', 'E-274',
  'A-804', 'H5EU', 'TC 534', 'A10SW', 'A00010WI', 'A16SO', 'E00069EN', '2A13', 'G17CE',
  'A41EU', 'A-684', 'A19SW', 'P6NE', 'H4NM', 'E3GL', 'P41EA', 'A00073CE', '4A20',
  'P28EA', 'ATC 201', 'A28NM', 'P27EA', 'A00007SE', 'R00004RC'
];

async function scrapeTcds() {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  const results = {};
  
  for (const tcds of testTcds) {
    console.log(`Processing: ${tcds}`);
    
    await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails');
    await page.waitForTimeout(3000);
    
    // Step 1: Click Reset button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const resetBtn = buttons.find(btn => btn.textContent.toLowerCase().includes('reset'));
      if (resetBtn) resetBtn.click();
    });
    await page.waitForTimeout(2000);
    
    // Step 2: Click the TCDS Number "Choose" dropdown button
    const clicked = await page.evaluate(() => {
      // Find the TCDS Number label
      const labels = Array.from(document.querySelectorAll('*'));
      for (const label of labels) {
        if (label.textContent && label.textContent.trim() === 'TCDS Number') {
          // Look for the dropdown button directly below it
          const parent = label.parentElement;
          if (parent) {
            // Find the button/select that says "Choose"
            const chooseButton = parent.querySelector('button') || 
                               parent.querySelector('select') ||
                               parent.querySelector('[role="button"]') ||
                               Array.from(parent.querySelectorAll('*')).find(el => 
                                 el.textContent && el.textContent.includes('Choose'));
            
            if (chooseButton) {
              chooseButton.click();
              return true;
            }
          }
        }
      }
      return false;
    });
    
    if (!clicked) {
      console.log('❌ Could not click TCDS dropdown');
      continue;
    }
    
    await page.waitForTimeout(2000);
    console.log('✅ Clicked TCDS dropdown');
    
    // Step 3: Type in the search input that appears (the yellow highlighted one)
    await page.evaluate((tcdsNumber) => {
      // Look for the search input that appears after clicking dropdown
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      
      // Find the input that's NOT the keyword search (at bottom)
      for (const input of inputs) {
        const rect = input.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        
        // Skip if it's in the keyword search section
        const parent = input.closest('div');
        const isKeywordSearch = parent && parent.textContent.includes('Keyword Search');
        
        if (isVisible && !isKeywordSearch) {
          input.focus();
          input.value = tcdsNumber;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
    }, tcds);
    
    await page.waitForTimeout(2000);
    console.log(`✅ Typed ${tcds} in search`);
    
    // Step 4: Click the checkbox directly to the left of the matching TCDS
    const checkboxClicked = await page.evaluate((tcdsNumber) => {
      // Look for the exact TCDS text in the dropdown list
      const items = Array.from(document.querySelectorAll('*'));
      for (const item of items) {
        const text = item.textContent || '';
        if (text.trim() === tcdsNumber) {
          // Find the checkbox directly to the left (previous sibling or in same container)
          const checkbox = item.previousElementSibling?.querySelector('input[type="checkbox"]') ||
                          item.parentElement?.querySelector('input[type="checkbox"]') ||
                          item.querySelector('input[type="checkbox"]');
          
          if (checkbox) {
            checkbox.click();
            return true;
          }
        }
      }
      return false;
    }, tcds);
    
    if (checkboxClicked) {
      console.log(`✅ Clicked ${tcds} checkbox`);
    } else {
      console.log(`❌ Could not find ${tcds} checkbox`);
    }
    
    // Step 5: Click Apply button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyBtn = buttons.find(btn => btn.textContent.toLowerCase().includes('apply'));
      if (applyBtn) applyBtn.click();
    });
    
    await page.waitForTimeout(5000);
    console.log('✅ Clicked Apply');
    
    // Step 6: Get document URL
    const url = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
      return links.length > 0 ? links[0].href : null;
    });
    
    if (url) {
      results[tcds] = url;
      console.log(`✅ ${tcds}: ${url}`);
    } else {
      console.log(`❌ ${tcds}: No URL found`);
    }
  }
  
  await browser.close();
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(results);
  
  if (Object.keys(results).length > 0) {
    // Save as JSON
    fs.writeFileSync('exact-flow-results.json', JSON.stringify(results, null, 2));
    console.log('💾 Saved to exact-flow-results.json');
    
    // Generate TypeScript format for webapp
    const tsCode = `// TCDS URLs scraped from FAA DRS - ${new Date().toISOString()}
const tcdsDirectUrls: Record<string, string> = {
${Object.entries(results).map(([tcds, url]) => `  '${tcds}': '${url}',`).join('\n')}
};

export { tcdsDirectUrls };`;
    
    fs.writeFileSync('tcds-urls-for-webapp.ts', tsCode);
    console.log('💾 Saved TypeScript format to tcds-urls-for-webapp.ts');
    
    // Auto-update the webapp file
    try {
      const webappPath = '../src/components/CertificationTable.tsx';
      const webappContent = fs.readFileSync(webappPath, 'utf8');
      
      // Replace the tcdsDirectUrls object
      const newUrls = Object.entries(results)
        .map(([tcds, url]) => `  '${tcds}': '${url}',`)
        .join('\n');
      
      const updatedContent = webappContent.replace(
        /const tcdsDirectUrls: Record<string, string> = {[\s\S]*?};/,
        `const tcdsDirectUrls: Record<string, string> = {
${newUrls}
};`
      );
      
      fs.writeFileSync(webappPath, updatedContent);
      console.log('✅ Auto-updated webapp with new TCDS URLs!');
    } catch (error) {
      console.log('⚠️ Could not auto-update webapp:', error.message);
    }
  }
  
  return results;
}

scrapeTcds();