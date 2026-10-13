const puppeteer = require('puppeteer');
const fs = require('fs');

const testTcds = ['E7CE', 'A10SW'];

async function correctTcdsFlow() {
  console.log('Starting correct TCDS flow...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    slowMo: 300
  });
  
  const page = await browser.newPage();
  
  // Block downloads properly
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('.pdf') || req.url().includes('download')) {
      req.abort();
    } else {
      req.continue();
    }
  });
  
  const results = {};
  
  for (const tcds of testTcds) {
    console.log(`\n🔍 Processing: ${tcds}`);
    
    try {
      await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails');
      await page.waitForTimeout(5000);
      
      // Step 1: Click TCDS Number button to open dropdown interface
      console.log('Step 1: Clicking TCDS Number button...');
      
      const tcdsButtonClicked = await page.evaluate(() => {
        // Look for button that says "TCDS Number" or similar
        const buttons = Array.from(document.querySelectorAll('button, a, span[onclick], div[onclick]'));
        
        for (const btn of buttons) {
          const text = btn.textContent || btn.title || '';
          if (text.toLowerCase().includes('tcds number') || 
              text.toLowerCase().includes('tcds') && text.toLowerCase().includes('number')) {
            btn.click();
            return text;
          }
        }
        return null;
      });
      
      if (!tcdsButtonClicked) {
        console.log('❌ TCDS Number button not found');
        continue;
      }
      
      console.log(`✅ Clicked: "${tcdsButtonClicked}"`);
      await page.waitForTimeout(3000);
      
      // Step 2: Find and use the mini search bar (above the checkboxes)
      console.log('Step 2: Looking for mini search bar...');
      
      const miniSearchUsed = await page.evaluate((tcdsNumber) => {
        // Look for input fields that appeared after clicking TCDS button
        const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
        
        // Find the mini search bar (usually the newest/last visible input)
        for (let i = inputs.length - 1; i >= 0; i--) {
          const input = inputs[i];
          const rect = input.getBoundingClientRect();
          
          // Check if it's visible and not the main keyword search
          if (rect.width > 0 && rect.height > 0) {
            const placeholder = input.placeholder || '';
            const name = input.name || '';
            const id = input.id || '';
            
            // Skip main keyword search
            if (placeholder.toLowerCase().includes('keyword') || 
                name.toLowerCase().includes('keyword') ||
                id.toLowerCase().includes('keyword')) {
              continue;
            }
            
            // This should be our mini search bar
            input.focus();
            input.value = '';
            input.value = tcdsNumber;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
              success: true,
              placeholder: placeholder,
              name: name,
              id: id
            };
          }
        }
        return { success: false };
      }, tcds);
      
      if (!miniSearchUsed.success) {
        console.log('❌ Mini search bar not found');
        continue;
      }
      
      console.log(`✅ Used mini search bar: ${JSON.stringify(miniSearchUsed)}`);
      await page.waitForTimeout(2000);
      
      // Step 3: Find and click the general search button
      console.log('Step 3: Looking for general search button...');
      
      const searchButtonClicked = await page.evaluate(() => {
        // Look for search/submit buttons
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent || btn.value || btn.title || '';
          const type = btn.type || '';
          
          if (text.toLowerCase().includes('search') || 
              text.toLowerCase().includes('submit') ||
              text.toLowerCase().includes('go') ||
              type === 'submit') {
            
            // Skip if it's specifically for keywords
            if (text.toLowerCase().includes('keyword')) {
              continue;
            }
            
            btn.click();
            return text || type;
          }
        }
        return null;
      });
      
      if (!searchButtonClicked) {
        console.log('❌ General search button not found');
        continue;
      }
      
      console.log(`✅ Clicked search button: "${searchButtonClicked}"`);
      await page.waitForTimeout(5000);
      
      // Step 4: Get document URLs from results (without downloading)
      console.log('Step 4: Looking for document URLs...');
      
      const documentUrl = await page.evaluate((tcdsNumber) => {
        const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
        
        // Try to find link that matches our TCDS
        for (const link of links) {
          const rowText = link.closest('tr')?.textContent || '';
          const linkText = link.textContent || '';
          
          if (rowText.includes(tcdsNumber) || linkText.includes(tcdsNumber)) {
            return {
              url: link.href,
              text: linkText,
              row: rowText.substring(0, 100)
            };
          }
        }
        
        // Return first link if no exact match
        if (links.length > 0) {
          return {
            url: links[0].href,
            text: links[0].textContent || '',
            row: links[0].closest('tr')?.textContent?.substring(0, 100) || ''
          };
        }
        
        return null;
      }, tcds);
      
      if (documentUrl) {
        results[tcds] = documentUrl.url;
        console.log(`✅ SUCCESS: ${documentUrl.url}`);
        console.log(`   Text: ${documentUrl.text}`);
        console.log(`   Row: ${documentUrl.row}`);
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
    fs.writeFileSync('correct-tcds-urls.json', JSON.stringify(results, null, 2));
    console.log('💾 Saved to correct-tcds-urls.json');
  }
  
  return results;
}

correctTcdsFlow();