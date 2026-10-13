const puppeteer = require('puppeteer');
const fs = require('fs');

const allTcdsNumbers = [
  'ATC 42 Textron Lycoming', 'P19NE', 'E7CE', 'TC 653', 'A14SO', 'E4IN', 'E5NE', 'E-274',
  'A-804', 'H5EU', 'TC 534', 'A10SW', 'A00010WI', 'A16SO', 'E00069EN', '2A13', 'G17CE',
  'A41EU', 'A-684', 'A19SW', 'P6NE', 'H4NM', 'E3GL', 'P41EA', 'A00073CE', '4A20',
  'P28EA', 'ATC 201', 'A28NM', 'P27EA', 'A00007SE', 'R00004RC'
];

async function scrapePreciseTcdsUrls() {
  console.log('Starting PRECISE TCDS scraper...');
  
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
      await page.goto('https://drs.faa.gov/browse', { waitUntil: 'networkidle0' });
      await page.waitForTimeout(3000);
      
      // Search for TCDS
      const searchSelector = 'input[type="text"], input[name*="search"], #searchText';
      await page.waitForSelector(searchSelector, { timeout: 10000 });
      await page.click(searchSelector);
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.type(searchSelector, tcds);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
      
      // Look specifically for TCDS documents
      const documentUrl = await page.evaluate((tcdsNumber) => {
        const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
        
        // Look for links that specifically mention TCDS in their text or nearby text
        for (const link of links) {
          const linkText = link.textContent || '';
          const parentText = link.parentElement?.textContent || '';
          const rowText = link.closest('tr')?.textContent || '';
          
          // Check if this link is specifically for a TCDS document
          const isTcds = linkText.toLowerCase().includes('tcds') ||
                        parentText.toLowerCase().includes('tcds') ||
                        rowText.toLowerCase().includes('tcds') ||
                        rowText.toLowerCase().includes('type certificate data sheet');
          
          // Also check if the TCDS number appears in the same row
          const containsTcdsNumber = rowText.includes(tcdsNumber) ||
                                   rowText.includes(tcdsNumber.replace(/[^A-Z0-9]/g, ''));
          
          if (isTcds && containsTcdsNumber) {
            console.log('Found TCDS match:', linkText, rowText);
            return link.href;
          }
        }
        
        // Fallback: look for any link that mentions TCDS
        const tcdsLink = links.find(link => {
          const text = (link.textContent || '').toLowerCase();
          return text.includes('tcds') || text.includes('type certificate');
        });
        
        return tcdsLink ? tcdsLink.href : null;
      }, tcds);
      
      if (documentUrl) {
        results[tcds] = documentUrl;
        successCount++;
        console.log(`✓ FOUND TCDS: ${documentUrl}`);
      } else {
        console.log(`✗ No TCDS document found`);
      }
      
    } catch (error) {
      console.log(`✗ ERROR: ${error.message}`);
    }
    
    await page.waitForTimeout(3000);
  }
  
  await browser.close();
  
  // Save results
  const tsCode = `// Precise TCDS URLs - ${new Date().toISOString()}
export const tcdsDirectUrls: Record<string, string> = {
${Object.entries(results).map(([tcds, url]) => `  '${tcds}': '${url}',`).join('\n')}
};`;
  
  fs.writeFileSync('precise-tcds-urls.ts', tsCode);
  
  console.log(`\n🎯 PRECISE SCRAPING COMPLETE!`);
  console.log(`✓ Found ${successCount}/${allTcdsNumbers.length} TCDS URLs`);
  console.log(`📁 Results saved to: precise-tcds-urls.ts`);
  
  return results;
}

scrapePreciseTcdsUrls().catch(console.error);