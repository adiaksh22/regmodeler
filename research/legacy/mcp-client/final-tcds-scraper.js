const puppeteer = require('puppeteer');
const fs = require('fs');

const testTcds = ['E7CE', 'A10SW', '2A13'];

async function scrapeTcdsCorrectly() {
  console.log('Starting correct TCDS scraper...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Block downloads using CDP
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'deny'
  });
  
  const results = {};
  
  for (const tcds of testTcds) {
    console.log(`\nProcessing: ${tcds}`);
    
    try {
      await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails');
      await page.waitForTimeout(5000);
      
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
        await page.waitForTimeout(3000);
      } else {
        console.log('⚠️ Reset button not found');
      }
      
      // Step 1: Click the TCDS Number dropdown (the "Choose" button)
      console.log('Step 1: Looking for TCDS Number dropdown...');
      
      // Find the TCDS Number dropdown by looking for the "Choose" button in the TCDS Number section
      const tcdsDropdownClicked = await page.evaluate(() => {
        // Find TCDS Number label and its associated dropdown
        const labels = Array.from(document.querySelectorAll('*'));
        for (const label of labels) {
          if (label.textContent && label.textContent.trim() === 'TCDS Number') {
            // Look in the same container for the Choose dropdown
            let container = label.parentElement;
            while (container) {
              const selects = container.querySelectorAll('select');
              for (const select of selects) {
                if (select.textContent.includes('Choose')) {
                  select.click();
                  return true;
                }
              }
              container = container.parentElement;
              if (container === document.body) break;
            }
          }
        }
        return false;
      });
      
      if (!tcdsDropdownClicked) {
        console.log('❌ TCDS Number dropdown not found');
        continue;
      }
      
      await page.waitForTimeout(2000);
      console.log('✅ Clicked TCDS Number dropdown');
      
      // Step 2: Type in the search input that appeared
      console.log('Step 2: Typing in TCDS search input...');
      
      // Find and type in the search input that appeared after clicking dropdown
      const typedInSearch = await page.evaluate((tcdsNumber) => {
        // Look for the search input that appeared (should be visible and not a date field)
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        for (const input of inputs) {
          const rect = input.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0;
          const placeholder = (input.placeholder || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          
          // Skip date fields and keyword search
          if (placeholder.includes('date') || name.includes('date') || 
              placeholder.includes('keyword') || name.includes('keyword')) {
            continue;
          }
          
          // This should be our TCDS search input
          if (isVisible) {
            input.focus();
            input.value = '';
            input.value = tcdsNumber;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      }, tcds);
      
      if (!typedInSearch) {
        console.log('❌ Could not type in TCDS search input');
        continue;
      }
      
      await page.waitForTimeout(2000);
      console.log(`✅ Typed "${tcds}" in search input`);
      
      // Step 3: Click the checkbox for the matching TCDS
      console.log('Step 3: Looking for TCDS checkbox...');
      
      await page.waitForTimeout(2000); // Wait for dropdown to populate
      
      const checkboxClicked = await page.evaluate((tcdsNumber) => {
        // Look for checkbox or clickable item with the TCDS number
        const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"], label, li, div'));
        for (const item of checkboxes) {
          const text = item.textContent || item.value || '';
          if (text.includes(tcdsNumber)) {
            item.click();
            return true;
          }
        }
        return false;
      }, tcds);
      
      if (checkboxClicked) {
        console.log('✅ Clicked TCDS checkbox');
      } else {
        console.log('⚠️ TCDS checkbox not found, trying Enter key');
        await page.keyboard.press('Enter');
      }
      
      await page.waitForTimeout(2000);
      
      // Step 4: Click Apply button to search
      console.log('Step 4: Clicking Apply button...');
      
      const applyButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const text = btn.textContent || '';
          if (text.toLowerCase().includes('apply')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (applyButton) {
        console.log('✅ Clicked Apply button');
        await page.waitForTimeout(5000);
      } else {
        console.log('⚠️ Apply button not found');
      }
      
      // Step 5: Get the document URL (without downloading)
      console.log('Step 5: Getting document URL...');
      
      const documentUrl = await page.evaluate((tcdsNumber) => {
        const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
        
        // Try to find the link that matches our TCDS
        for (const link of links) {
          const rowText = link.closest('tr')?.textContent || '';
          const linkText = link.textContent || '';
          
          if (rowText.includes(tcdsNumber) || linkText.includes(tcdsNumber)) {
            return link.href;
          }
        }
        
        // Return first link if no exact match
        return links.length > 0 ? links[0].href : null;
      }, tcds);
      
      if (documentUrl) {
        results[tcds] = documentUrl;
        console.log(`✅ SUCCESS: ${documentUrl}`);
      } else {
        console.log('❌ No document URL found');
      }
      
    } catch (error) {
      console.log(`❌ ERROR with ${tcds}: ${error.message}`);
    }
    
    await page.waitForTimeout(2000);
  }
  
  await browser.close();
  
  console.log('\n📊 FINAL RESULTS:');
  console.log(results);
  
  if (Object.keys(results).length > 0) {
    fs.writeFileSync('final-tcds-results.json', JSON.stringify(results, null, 2));
    console.log('💾 Saved to final-tcds-results.json');
  }
  
  return results;
}

scrapeTcdsCorrectly();