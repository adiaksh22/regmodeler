const puppeteer = require('puppeteer');
const fs = require('fs');

const allTcdsNumbers = [
  'ATC 42 Textron Lycoming', 'P19NE', 'E7CE', 'TC 653', 'A14SO', 'E4IN', 'E5NE', 'E-274',
  'A-804', 'H5EU', 'TC 534', 'A10SW', 'A00010WI', 'A16SO', 'E00069EN', '2A13', 'G17CE',
  'A41EU', 'A-684', 'A19SW', 'P6NE', 'H4NM', 'E3GL', 'P41EA', 'A00073CE', '4A20',
  'P28EA', 'ATC 201', 'A28NM', 'P27EA', 'A00007SE', 'R00004RC'
];

async function scrapeTcdsFromDedicatedPage() {
  console.log('Starting TCDS-specific scraper...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  const results = {};
  let successCount = 0;
  
  for (let i = 0; i < allTcdsNumbers.length; i++) {
    const tcds = allTcdsNumbers[i];
    console.log(`[${i+1}/${allTcdsNumbers.length}] Processing: ${tcds}`);
    
    try {
      // Go directly to TCDS search page
      await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails', { 
        waitUntil: 'networkidle0' 
      });
      await page.waitForTimeout(3000);
      
      // Look for TCDS Number dropdown/input field specifically
      const tcdsSelectors = [
        'input[name*="tcds"]',
        'input[placeholder*="TCDS"]',
        'select[name*="tcds"]',
        '#tcdsNumber',
        '.tcds-input',
        'input[id*="tcds"]'
      ];
      
      let tcdsInput = null;
      for (const selector of tcdsSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          tcdsInput = await page.$(selector);
          if (tcdsInput) {
            console.log(`Found TCDS input with selector: ${selector}`);
            break;
          }
        } catch (e) {}
      }
      
      // If no specific TCDS input found, look for any input
      if (!tcdsInput) {
        const allInputs = await page.$$('input[type="text"], select');
        if (allInputs.length > 0) {
          tcdsInput = allInputs[0]; // Try first input
          console.log('Using first available input field');
        }
      }
      
      if (tcdsInput) {
        // Clear and enter TCDS number
        await tcdsInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await tcdsInput.type(tcds);
        
        // Try different ways to submit
        try {
          await page.keyboard.press('Enter');
        } catch (e) {
          // Try clicking a search/submit button
          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            '.search-btn',
            'button:contains("Search")',
            'button:contains("Go")'
          ];
          
          for (const btnSelector of submitSelectors) {
            try {
              const btn = await page.$(btnSelector);
              if (btn) {
                await btn.click();
                break;
              }
            } catch (e) {}
          }
        }
        
        await page.waitForTimeout(5000);
        
        // Look for TCDS document links after search
        const documentUrl = await page.evaluate((tcdsNumber) => {
          // Look for links to TCDS documents
          const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
          
          // Try to find the link that matches our TCDS number
          for (const link of links) {
            const linkText = link.textContent || '';
            const rowText = link.closest('tr')?.textContent || '';
            
            // Check if this row contains our TCDS number
            if (rowText.includes(tcdsNumber) || linkText.includes(tcdsNumber)) {
              console.log(`Found matching TCDS link: ${linkText}`);
              return link.href;
            }
          }
          
          // If no exact match, return first link (but log this)
          if (links.length > 0) {
            console.log(`No exact match found, using first link: ${links[0].textContent}`);
            return links[0].href;
          }
          
          return null;
        }, tcds);
        
        if (documentUrl) {
          results[tcds] = documentUrl;
          successCount++;
          console.log(`✓ FOUND: ${documentUrl}`);
        } else {
          console.log(`✗ No document found`);
        }
      } else {
        console.log(`✗ Could not find search input`);
      }
      
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
    }
    
    await page.waitForTimeout(2000);
  }
  
  await browser.close();
  
  // Save results
  const tsCode = `// TCDS URLs from dedicated search page - ${new Date().toISOString()}
export const tcdsDirectUrls: Record<string, string> = {
${Object.entries(results).map(([tcds, url]) => `  '${tcds}': '${url}',`).join('\n')}
};`;
  
  fs.writeFileSync('tcds-dedicated-urls.ts', tsCode);
  
  console.log(`\n🎯 TCDS-SPECIFIC SCRAPING COMPLETE!`);
  console.log(`✓ Found ${successCount}/${allTcdsNumbers.length} TCDS URLs`);
  console.log(`📁 Results saved to: tcds-dedicated-urls.ts`);
  
  return results;
}

scrapeTcdsFromDedicatedPage().catch(console.error);