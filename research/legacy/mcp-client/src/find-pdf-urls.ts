import puppeteer from 'puppeteer';
import fs from 'fs';

const tcdsNumbers = [
  'ATC 42 Textron Lycoming', 'P19NE', 'E7CE', 'TC 653', 'A14SO', 'E4IN', 'E5NE', 'E-274',
  'A-804', 'H5EU', 'TC 534', 'A10SW', 'A00010WI', 'A16SO', 'E00069EN', '2A13', 'G17CE',
  'A41EU', 'A-684', 'A19SW', 'P6NE', 'H4NM', 'E3GL', 'P41EA', 'A00073CE', '4A20',
  'P28EA', 'ATC 201', 'A28NM', 'P27EA', 'A00007SE', 'R00004RC'
];

async function scrapeTcdsUrls() {
  const browser = await puppeteer.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();
  const results: Record<string, string> = {};
  
  try {
    for (const tcds of tcdsNumbers) {
      console.log(`Scraping ${tcds}...`);
      
      // Navigate to FAA DRS
      await page.goto('https://drs.faa.gov/browse', { waitUntil: 'networkidle2' });
      
      // Clear and type in search box
      await page.waitForSelector('input[type="text"]', { timeout: 10000 });
      await page.click('input[type="text"]');
      await page.keyboard.selectAll();
      await page.type('input[type="text"]', tcds);
      
      // Click search button
      await page.click('button[type="submit"], .search-btn, input[type="submit"]');
      
      // Wait for results
      await page.waitForTimeout(3000);
      
      // Look for TCDS document links
      const links = await page.evaluate(() => {
        const linkElements = Array.from(document.querySelectorAll('a'));
        return linkElements
          .filter(link => link.href.includes('excelExternalWindow'))
          .map(link => link.href);
      });
      
      if (links.length > 0) {
        results[tcds] = links[0];
        console.log(`✓ Found: ${tcds} -> ${links[0]}`);
      } else {
        console.log(`✗ No URL found for ${tcds}`);
      }
      
      // Rate limiting
      await page.waitForTimeout(2000);
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    await browser.close();
  }
  
  // Generate TypeScript mapping
  const mapping = Object.entries(results)
    .map(([tcds, url]) => `  '${tcds}': '${url}',`)
    .join('\n');
    
  const code = `// Auto-generated TCDS URL mapping\nconst tcdsDirectUrls: Record<string, string> = {\n${mapping}\n};\n\nexport { tcdsDirectUrls };`;
  
  fs.writeFileSync('tcds-urls.ts', code);
  console.log('\n✓ Mapping saved to tcds-urls.ts');
  console.log(`Found ${Object.keys(results).length} TCDS URLs`);
}

scrapeTcdsUrls().catch(console.error);