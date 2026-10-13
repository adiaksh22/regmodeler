const puppeteer = require('puppeteer');
const fs = require('fs');

const tcdsNumbers = ['E7CE', 'A10SW', '2A13', 'A14SO', 'P19NE'];

async function main() {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  const results = {};
  
  console.log('Browser launched, starting scraping...');
  
  for (const tcds of tcdsNumbers) {
    console.log(`Processing ${tcds}...`);
    
    try {
      await page.goto('https://drs.faa.gov/browse');
      await page.waitForTimeout(3000);
      
      // Type in search box
      await page.type('input[type="text"]', tcds);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
      
      // Look for document links
      const url = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="excelExternalWindow"]');
        return links.length > 0 ? links[0].href : null;
      });
      
      if (url) {
        results[tcds] = url;
        console.log(`Found: ${tcds} -> ${url}`);
      } else {
        console.log(`Not found: ${tcds}`);
      }
      
    } catch (error) {
      console.log(`Error with ${tcds}:`, error.message);
    }
  }
  
  // Save results
  const code = `export const tcdsUrls = ${JSON.stringify(results, null, 2)};`;
  fs.writeFileSync('tcds-results.js', code);
  
  console.log('Results saved to tcds-results.js');
  console.log('Found URLs for:', Object.keys(results));
  
  await browser.close();
}

main().catch(console.error);