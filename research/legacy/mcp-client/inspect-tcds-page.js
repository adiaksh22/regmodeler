const puppeteer = require('puppeteer');
const fs = require('fs');

async function inspectTcdsPage() {
  console.log('Inspecting TCDS page to find correct selectors...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails', { 
      waitUntil: 'networkidle0' 
    });
    await page.waitForTimeout(5000);
    
    // Inspect all form elements on the page
    const formElements = await page.evaluate(() => {
      const elements = [];
      
      // Get all inputs
      document.querySelectorAll('input').forEach((input, index) => {
        elements.push({
          type: 'input',
          index,
          tagName: input.tagName,
          type_attr: input.type,
          name: input.name,
          id: input.id,
          className: input.className,
          placeholder: input.placeholder,
          value: input.value,
          outerHTML: input.outerHTML.substring(0, 200)
        });
      });
      
      // Get all selects
      document.querySelectorAll('select').forEach((select, index) => {
        elements.push({
          type: 'select',
          index,
          tagName: select.tagName,
          name: select.name,
          id: select.id,
          className: select.className,
          outerHTML: select.outerHTML.substring(0, 200)
        });
      });
      
      // Get all labels to understand what each field is for
      document.querySelectorAll('label').forEach((label, index) => {
        elements.push({
          type: 'label',
          index,
          textContent: label.textContent,
          for: label.getAttribute('for'),
          outerHTML: label.outerHTML.substring(0, 200)
        });
      });
      
      return elements;
    });
    
    console.log('\n=== PAGE FORM ELEMENTS ===');
    formElements.forEach(element => {
      console.log(`${element.type.toUpperCase()} #${element.index}:`);
      console.log(`  Name: ${element.name || 'none'}`);
      console.log(`  ID: ${element.id || 'none'}`);
      console.log(`  Class: ${element.className || 'none'}`);
      if (element.placeholder) console.log(`  Placeholder: ${element.placeholder}`);
      if (element.textContent) console.log(`  Text: ${element.textContent}`);
      console.log(`  HTML: ${element.outerHTML}`);
      console.log('---');
    });
    
    // Wait for user to identify the correct field
    console.log('\n🔍 PLEASE IDENTIFY THE TCDS DROPDOWN/INPUT:');
    console.log('Look at the browser window and the form elements listed above.');
    console.log('Press Enter when you want to continue with a test search...');
    
    // Keep browser open for inspection
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

inspectTcdsPage().catch(console.error);