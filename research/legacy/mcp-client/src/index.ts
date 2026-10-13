import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const server = new Server(
  {
    name: 'faa-tcds-lookup',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// TCDS numbers from the dataset
const tcdsNumbers = [
  'ATC 42 Textron Lycoming',
  'P19NE',
  'E7CE',
  'TC 653',
  'A14SO',
  'E4IN',
  'E5NE',
  'E-274',
  'A-804',
  'H5EU',
  'TC 534',
  'A10SW',
  'A00010WI',
  'A16SO',
  'E00069EN',
  '2A13',
  'G17CE',
  'A41EU',
  'A-684',
  'A19SW',
  'P6NE',
  'H4NM',
  'E3GL',
  'P41EA',
  'A00073CE',
  '4A20',
  'P28EA',
  'ATC 201',
  'A28NM',
  'P27EA',
  'A00007SE',
  'R00004RC'
];

async function lookupTcdsDocumentId(tcdsNumber: string): Promise<string | null> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to FAA DRS
    await page.goto('https://drs.faa.gov/', { waitUntil: 'networkidle2' });
    
    // Search for TCDS number
    await page.type('input[type="search"], input[name="search"]', tcdsNumber);
    await page.click('button[type="submit"], .search-button');
    
    // Wait for results
    await page.waitForSelector('.search-results, .result-item', { timeout: 10000 });
    
    // Look for TCDS result links
    const links = await page.$$eval('a[href*="excelExternalWindow"]', (elements) =>
      elements.map(el => el.getAttribute('href')).filter(href => href)
    );
    
    if (links.length > 0) {
      const documentId = links[0]?.match(/excelExternalWindow\/([^?]+)/)?.[1];
      return documentId || null;
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up ${tcdsNumber}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'lookup_all_tcds') {
    const results: Record<string, string> = {};
    
    for (const tcdsNumber of tcdsNumbers) {
      console.log(`Looking up ${tcdsNumber}...`);
      const documentId = await lookupTcdsDocumentId(tcdsNumber);
      
      if (documentId) {
        results[tcdsNumber] = documentId;
        console.log(`Found: ${tcdsNumber} -> ${documentId}`);
      } else {
        console.log(`Not found: ${tcdsNumber}`);
      }
      
      // Add delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${request.params.name}`);
});

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'lookup_all_tcds',
        description: 'Lookup all TCDS document IDs from FAA DRS',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FAA TCDS Lookup MCP server running on stdio');
}

main().catch(console.error);