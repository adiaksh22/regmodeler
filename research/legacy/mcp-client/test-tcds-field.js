const puppeteer = require('puppeteer');
const fs = require('fs');

// Test with just a few TCDS numbers first
const testTcdsNumbers = ['E7CE', 'A10SW', '2A13'];

async function findTcdsField() {
  console.log('Testing TCDS field detection...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  const results = {};
  
  try {
    await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails', { 
      waitUntil: 'networkidle0' 
    });
    await page.waitForTimeout(5000);
    
    for (const tcds of testTcdsNumbers) {
      console.log(`\nTesting with: ${tcds}`);
      
      // Try multiple approaches to find and use TCDS field
      const approaches = [
        // Approach 1: Look for select dropdown
        async () => {
          console.log('Trying select dropdown...');
          const selects = await page.$$('select');
          if (selects.length > 0) {
            await selects[0].click();
            await selects[0].type(tcds);
            return true;
          }
          return false;
        },
        
        // Approach 2: Look for input with TCDS in label
        async () => {
          console.log('Trying input with TCDS label...');
          const tcdsInput = await page.$('input[name*="tcds"], input[id*="tcds"]');
          if (tcdsInput) {
            await tcdsInput.click();
            await tcdsInput.type(tcds);
            return true;
          }
          return false;
        },
        
        // Approach 3: Try all text inputs
        async () => {
          console.log('Trying all text inputs...');
          const inputs = await page.$$('input[type="text"]');
          for (let i = 0; i < inputs.length; i++) {
            try {
              await inputs[i].click();
              await page.keyboard.selectAll();
              await inputs[i].type(tcds);
              console.log(`Used input #${i}`);
              return true;
            } catch (e) {}
          }
          return false;
        }
      ];
      
      // Try each approach
      let success = false;
      for (const approach of approaches) {
        try {
          if (await approach()) {
            success = true;
            break;
          }
        } catch (e) {
          console.log('Approach failed:', e.message);
        }
      }
      
      if (success) {
        // Submit search
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        
        // Look for results
        const documentUrl = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
          return links.length > 0 ? links[0].href : null;
        });
        
        if (documentUrl) {
          results[tcds] = documentUrl;
          console.log(`✓ Found: ${documentUrl}`);
        } else {
          console.log('✗ No document found');
        }
      } else {
        console.log('✗ Could not find TCDS input field');
      }
      
      // Reset page for next search
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\nResults:', results);
  return results;
}

findTcdsField().catch(console.error);