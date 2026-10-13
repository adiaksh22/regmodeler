const puppeteer = require('puppeteer');
const fs = require('fs');

const testTcds = ['E7CE'];

async function scrapeTcdsDropdown() {
  console.log('Starting TCDS dropdown scraper...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    slowMo: 500 // Slow down actions to see what's happening
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails');
    await page.waitForTimeout(5000);
    
    console.log('Page loaded, looking for TCDS button...');
    
    // Find and click TCDS button
    const tcdsButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.textContent || '';
        if (text.toLowerCase().includes('tcds')) {
          btn.click();
          return text;
        }
      }
      return null;
    });
    
    if (!tcdsButton) {
      console.log('❌ TCDS button not found');
      return;
    }
    
    console.log(`✅ Clicked TCDS button: "${tcdsButton}"`);
    await page.waitForTimeout(5000); // Wait longer for dropdown to appear
    
    // Now look for the TCDS dropdown/search interface
    console.log('Looking for TCDS dropdown interface...');
    
    // Take a screenshot to see what appeared
    await page.screenshot({ path: 'after-tcds-click.png', fullPage: true });
    console.log('📸 Screenshot saved as after-tcds-click.png');
    
    // Look for any new elements that appeared
    const dropdownElements = await page.evaluate(() => {
      const elements = [];
      
      // Look for select elements
      document.querySelectorAll('select').forEach((select, i) => {
        const rect = select.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            type: 'select',
            index: i,
            id: select.id,
            name: select.name,
            className: select.className,
            options: Array.from(select.options).slice(0, 5).map(opt => opt.text)
          });
        }
      });
      
      // Look for input fields that might be TCDS search
      document.querySelectorAll('input').forEach((input, i) => {
        const rect = input.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          elements.push({
            type: 'input',
            index: i,
            id: input.id,
            name: input.name,
            className: input.className,
            placeholder: input.placeholder,
            type_attr: input.type
          });
        }
      });
      
      return elements;
    });
    
    console.log('\\n📋 Available form elements after clicking TCDS:');
    dropdownElements.forEach(el => {
      console.log(`${el.type.toUpperCase()} #${el.index}:`);
      console.log(`  ID: ${el.id || 'none'}`);
      console.log(`  Name: ${el.name || 'none'}`);
      console.log(`  Class: ${el.className || 'none'}`);
      if (el.placeholder) console.log(`  Placeholder: ${el.placeholder}`);
      if (el.options) console.log(`  Options: ${el.options.join(', ')}`);
      console.log('---');
    });
    
    // Try to find and use a select dropdown for TCDS
    const tcdsSelect = await page.evaluate((tcdsNumber) => {
      const selects = Array.from(document.querySelectorAll('select'));
      
      for (const select of selects) {
        const rect = select.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Check if this select has TCDS options
          const options = Array.from(select.options);
          const hasTcdsOptions = options.some(opt => 
            opt.text.includes(tcdsNumber) || 
            opt.value.includes(tcdsNumber)
          );
          
          if (hasTcdsOptions) {
            // Found the right select, choose the option
            for (const option of options) {
              if (option.text.includes(tcdsNumber) || option.value.includes(tcdsNumber)) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true, selectedText: option.text };
              }
            }
          }
        }
      }
      return { success: false };
    }, testTcds[0]);
    
    if (tcdsSelect.success) {
      console.log(`✅ Selected TCDS from dropdown: ${tcdsSelect.selectedText}`);
      await page.waitForTimeout(5000);
      
      // Look for document links
      const documentUrl = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
        return links.length > 0 ? links[0].href : null;
      });
      
      if (documentUrl) {
        console.log(`✅ Found document: ${documentUrl}`);
      } else {
        console.log('❌ No document found');
      }
    } else {
      console.log('❌ Could not find TCDS in dropdown');
    }
    
    // Keep browser open for inspection
    console.log('\\n🔍 Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  } finally {
    await browser.close();
  }
}

scrapeTcdsDropdown();