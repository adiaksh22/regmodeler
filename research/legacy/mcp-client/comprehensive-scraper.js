const puppeteer = require('puppeteer');
const fs = require('fs');

// All TCDS numbers from your dataset
const allTcdsNumbers = [
  'ATC 42 Textron Lycoming', 'P19NE', 'E7CE', 'TC 653', 'A14SO', 'E4IN', 'E5NE', 'E-274',
  'A-804', 'H5EU', 'TC 534', 'A10SW', 'A00010WI', 'A16SO', 'E00069EN', '2A13', 'G17CE',
  'A41EU', 'A-684', 'A19SW', 'P6NE', 'H4NM', 'E3GL', 'P41EA', 'A00073CE', '4A20',
  'P28EA', 'ATC 201', 'A28NM', 'P27EA', 'A00007SE', 'R00004RC'
];

async function scrapeTcdsUrls() {
  console.log('Starting comprehensive TCDS scraper...');
  
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
      // Navigate to FAA DRS
      await page.goto('https://drs.faa.gov/browse', { waitUntil: 'networkidle0' });
      await page.waitForTimeout(3000);
      
      // Clear search and enter TCDS
      const searchSelector = 'input[type="text"], input[name*="search"], #searchText';
      await page.waitForSelector(searchSelector, { timeout: 10000 });
      await page.click(searchSelector);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.type(searchSelector, tcds);
      
      // Submit search
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
      
      // Look for TCDS document links
      const documentUrl = await page.evaluate(() => {
        // Look for links containing excelExternalWindow
        const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
        
        // Prefer links that mention TCDS in text
        const tcdsLink = links.find(link => 
          link.textContent && link.textContent.toLowerCase().includes('tcds')
        );
        
        if (tcdsLink) return tcdsLink.href;
        
        // Fallback to any excelExternalWindow link
        return links.length > 0 ? links[0].href : null;
      });
      
      if (documentUrl) {
        results[tcds] = documentUrl;
        successCount++;
        console.log(`✓ SUCCESS: ${documentUrl}`);
      } else {
        console.log(`✗ No document found`);
      }
      
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
    }
    
    // Longer delay between requests
    await page.waitForTimeout(3000);
  }
  
  await browser.close();
  
  // Save results
  const tsCode = `// Auto-scraped TCDS URLs - ${new Date().toISOString()}
export const tcdsDirectUrls: Record<string, string> = {
${Object.entries(results).map(([tcds, url]) => `  '${tcds}': '${url}',`).join('\n')}
};`;
  
  fs.writeFileSync('all-tcds-urls.ts', tsCode);
  
  console.log(`\n🎉 SCRAPING COMPLETE!`);
  console.log(`✓ Found ${successCount}/${allTcdsNumbers.length} TCDS URLs`);
  console.log(`📁 Results saved to: all-tcds-urls.ts`);
  
  return results;
}

scrapeTcdsUrls().catch(console.error);