import {defineConfig,devices} from '@playwright/test';

const channel=process.env.BROWSER_CHANNEL;
if(channel&&!['chrome','msedge'].includes(channel))throw Error('BROWSER_CHANNEL must be chrome or msedge, or omitted for managed Chromium.');
export default defineConfig({
 testDir:'./tests/browser',fullyParallel:true,forbidOnly:!!process.env.CI,retries:0,workers:2,
 timeout:30_000,expect:{timeout:8_000},
 outputDir:'.artifacts/browser-results',
 reporter:[['list'],['html',{outputFolder:'.artifacts/browser-report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4183',channel,serviceWorkers:'block',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
  {name:'mobile',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}},
 ],
 webServer:{command:'node scripts/browser-server.mjs',url:'http://127.0.0.1:4183',reuseExistingServer:false,timeout:90_000},
});
