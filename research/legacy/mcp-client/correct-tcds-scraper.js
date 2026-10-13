const puppeteer = require('puppeteer');
const fs = require('fs');

const allTcdsNumbers = [
  'ATC 42 Textron Lycoming', 'P19NE', 'E7CE', 'TC 653', 'A14SO', 'E4IN', 'E5NE', 'E-274',
  'A-804', 'H5EU', 'TC 534', 'A10SW', 'A00010WI', 'A16SO', 'E00069EN', '2A13', 'G17CE',
  'A41EU', 'A-684', 'A19SW', 'P6NE', 'H4NM', 'E3GL', 'P41EA', 'A00073CE', '4A20',
  'P28EA', 'ATC 201', 'A28NM', 'P27EA', 'A00007SE', 'R00004RC'
];

async function scrapeTcdsWithCorrectFlow() {
  console.log('Starting TCDS scraper with correct flow...');
  
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
      await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails', { 
        waitUntil: 'networkidle0' 
      });
      await page.waitForTimeout(3000);
      
      // Click Reset button before starting search
      console.log('Clicking Reset button...');
      const resetButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent || '';
          if (text.toLowerCase().includes('reset')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (resetButton) {
        console.log('✅ Clicked Reset button');
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️ Reset button not found');
      }
      
      // Step 1: Click the TCDS search button to open the dropdown
      console.log('Step 1: Looking for TCDS search button...');
      const tcdsButtonSelectors = [
        'button:contains("TCDS")',
        '[title*="TCDS"]',
        '.tcds-search',
        'button[onclick*="tcds"]',
        'a[href*="tcds"]',
        // Look for buttons near "Status" and "Sub Status"
        'button', // We'll filter these
      ];
      
      let tcdsButton = null;
      for (const selector of tcdsButtonSelectors) {
        try {
          if (selector === 'button') {
            // Get all buttons and find one related to TCDS
            const buttons = await page.$$('button');
            for (const btn of buttons) {
              const text = await btn.evaluate(el => el.textContent || el.title || el.getAttribute('aria-label') || '');
              if (text.toLowerCase().includes('tcds')) {
                tcdsButton = btn;
                console.log(`Found TCDS button with text: ${text}`);
                break;
              }
            }
          } else {
            tcdsButton = await page.$(selector);
          }
          if (tcdsButton) break;
        } catch (e) {}
      }\n      \n      if (!tcdsButton) {\n        console.log('✗ Could not find TCDS search button');\n        continue;\n      }\n      \n      // Click the TCDS button to open the search interface\n      await tcdsButton.click();\n      await page.waitForTimeout(2000);\n      console.log('✓ Clicked TCDS search button');\n      \n      // Step 2: Find the mini search bar that appeared\n      console.log('Step 2: Looking for mini search bar...');\n      const miniSearchSelectors = [\n        'input[type=\"text\"]:not([style*=\"display: none\"])', // Visible text inputs\n        '.search-input',\n        '[placeholder*=\"search\"]',\n        '[placeholder*=\"TCDS\"]'\n      ];\n      \n      let miniSearchInput = null;\n      for (const selector of miniSearchSelectors) {\n        try {\n          const inputs = await page.$$(selector);\n          // Get the last/newest input (likely the one that just appeared)\n          if (inputs.length > 0) {\n            miniSearchInput = inputs[inputs.length - 1];\n            break;\n          }\n        } catch (e) {}\n      }\n      \n      if (!miniSearchInput) {\n        console.log('✗ Could not find mini search bar');\n        continue;\n      }\n      \n      // Step 3: Type TCDS number in the mini search bar\n      console.log('Step 3: Typing TCDS number in mini search bar...');\n      await miniSearchInput.click();\n      await page.keyboard.down('Control');\n      await page.keyboard.press('KeyA');\n      await page.keyboard.up('Control');\n      await miniSearchInput.type(tcds);\n      await page.waitForTimeout(1000);\n      \n      // Step 4: Look for the TCDS in the dropdown list and click it\n      console.log('Step 4: Looking for TCDS in dropdown list...');\n      await page.waitForTimeout(2000); // Wait for dropdown to populate\n      \n      // Look for dropdown items containing our TCDS\n      const dropdownItem = await page.evaluate((tcdsNumber) => {\n        // Look for elements that might be dropdown items\n        const items = Array.from(document.querySelectorAll('li, div, option, a'));\n        for (const item of items) {\n          const text = item.textContent || '';\n          if (text.includes(tcdsNumber)) {\n            item.click();\n            return true;\n          }\n        }\n        return false;\n      }, tcds);\n      \n      if (!dropdownItem) {\n        // Try pressing Enter as fallback\n        await page.keyboard.press('Enter');\n      }\n      \n      await page.waitForTimeout(3000);\n      \n      // Step 5: Look for the document link\n      console.log('Step 5: Looking for document link...');\n      const documentUrl = await page.evaluate((tcdsNumber) => {\n        const links = Array.from(document.querySelectorAll('a[href*=\"excelExternalWindow\"]'));\n        \n        // Try to find link that matches our TCDS\n        for (const link of links) {\n          const rowText = link.closest('tr')?.textContent || link.textContent || '';\n          if (rowText.includes(tcdsNumber)) {\n            return link.href;\n          }\n        }\n        \n        // Return first link if no exact match\n        return links.length > 0 ? links[0].href : null;\n      }, tcds);\n      \n      if (documentUrl) {\n        results[tcds] = documentUrl;\n        successCount++;\n        console.log(`✓ SUCCESS: ${documentUrl}`);\n      } else {\n        console.log(`✗ No document found`);\n      }\n      \n    } catch (error) {\n      console.log(`✗ ERROR: ${error.message}`);\n    }\n    \n    await page.waitForTimeout(2000);\n  }\n  \n  await browser.close();\n  \n  // Save results\n  const tsCode = `// Correct TCDS URLs - ${new Date().toISOString()}\nexport const tcdsDirectUrls: Record<string, string> = {\n${Object.entries(results).map(([tcds, url]) => `  '${tcds}': '${url}',`).join('\\n')}\n};`;\n  \n  fs.writeFileSync('correct-tcds-urls.ts', tsCode);\n  \n  console.log(`\\n🎯 CORRECT TCDS SCRAPING COMPLETE!`);\n  console.log(`✓ Found ${successCount}/${allTcdsNumbers.length} TCDS URLs`);\n  console.log(`📁 Results saved to: correct-tcds-urls.ts`);\n  \n  return results;\n}\n\nscrapeTcdsWithCorrectFlow().catch(console.error);