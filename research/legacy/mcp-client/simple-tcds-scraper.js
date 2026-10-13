const puppeteer = require('puppeteer');

const testTcds = ['E7CE', 'A10SW', '2A13'];

async function scrapeTcds() {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();
  const results = {};
  
  for (const tcds of testTcds) {
    console.log(`Processing: ${tcds}`);
    
    await page.goto('https://drs.faa.gov/browse/TCDSMODEL/doctypeDetails');
    await page.waitForTimeout(3000);
    
    // Click Reset
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const resetBtn = buttons.find(btn => btn.textContent.toLowerCase().includes('reset'));
      if (resetBtn) resetBtn.click();
    });
    await page.waitForTimeout(2000);
    
    // Click TCDS Number dropdown
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const select of selects) {
        const parent = select.closest('div');
        if (parent && parent.textContent.includes('TCDS Number')) {
          select.click();
          return;
        }
      }
    });
    await page.waitForTimeout(2000);
    
    // Type in search box (NOT keyword search - the one that appears after clicking TCDS dropdown)
    await page.evaluate((tcdsNumber) => {
      // Find the search input that appears in the TCDS dropdown area
      const tcdsSection = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent && el.textContent.includes('TCDS Number'));
      
      if (tcdsSection) {
        const container = tcdsSection.closest('div');
        if (container) {
          const searchInput = container.querySelector('input[type="text"]:not([placeholder*="keyword"]):not([placeholder*="Keyword"]):not([placeholder*="Enter text"])');
          if (searchInput) {
            searchInput.focus();
            searchInput.value = tcdsNumber;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }, tcds);
    await page.waitForTimeout(2000);
    
    // Click checkbox
    await page.evaluate((tcdsNumber) => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      for (const checkbox of checkboxes) {
        const parent = checkbox.closest('div, li, label');
        if (parent && parent.textContent.includes(tcdsNumber)) {
          checkbox.click();
          return;
        }
      }
    }, tcds);
    await page.waitForTimeout(1000);
    
    // Click Apply
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const applyBtn = buttons.find(btn => btn.textContent.toLowerCase().includes('apply'));
      if (applyBtn) applyBtn.click();
    });
    await page.waitForTimeout(5000);
    
    // Get document URL
    const url = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="excelExternalWindow"]'));
      return links.length > 0 ? links[0].href : null;
    });
    
    if (url) {
      results[tcds] = url;
      console.log(`✅ ${tcds}: ${url}`);
    } else {
      console.log(`❌ ${tcds}: No URL found`);
    }
  }
  
  await browser.close();
  console.log('\nResults:', results);
  return results;
}

scrapeTcds();