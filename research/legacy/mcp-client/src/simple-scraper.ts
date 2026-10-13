import puppeteer from 'puppeteer';
import fs from 'fs';

const tcdsNumbers = ['E7CE', 'A10SW', '2A13', 'A14SO', 'P19NE']; // Test with 5 first

async function scrapeTcdsUrls() {
  console.log('Starting TCDS URL scraper...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  const results: Record<string, string> = {};
  
  try {
    for (let i = 0; i < tcdsNumbers.length; i++) {
      const tcds = tcdsNumbers[i];
      console.log(`[${i+1}/${tcdsNumbers.length}] Processing ${tcds}...`);
      
      await page.goto('https://drs.faa.gov/browse', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      
      // Find and fill search input
      const searchInput = await page.$('input[type="text"]');
      if (searchInput) {
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(tcds);
        await page.waitForTimeout(1000);
        
        // Submit search
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        // Look for document links
        const documentUrl = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const docLink = links.find(link => 
            link.href.includes('excelExternalWindow') && 
            link.textContent?.includes('TCDS')
          );
          return docLink?.href || null;
        });
        
        if (documentUrl) {
          results[tcds] = documentUrl;
          console.log(`✓ Found: ${documentUrl}`);
        } else {
          console.log(`✗ No document found for ${tcds}`);
        }
      }
      
      await page.waitForTimeout(2000);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
  
  // Save results
  const mapping = Object.entries(results)
    .map(([tcds, url]) => `  '${tcds}': '${url}',`)
    .join('\n');
    
  const code = `export const tcdsDirectUrls: Record<string, string> = {\n${mapping}\n};`;
  
  fs.writeFileSync('tcds-urls.ts', code);
  console.log(`\n✓ Saved ${Object.keys(results).length} URLs to tcds-urls.ts`);
}

scrapeTcdsUrls().catch(console.error);