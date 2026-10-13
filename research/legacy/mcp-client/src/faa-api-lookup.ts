import fetch from 'node-fetch';
import fs from 'fs';

// FAA API endpoints
const FAA_API_BASE = 'https://api.faa.gov/faaDataService/v2';

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

async function lookupTcdsViaAPI(tcdsNumber: string) {
  try {
    // Try different API endpoints for TCDS data
    const endpoints = [
      `${FAA_API_BASE}/typeDataSearch/tcds/${encodeURIComponent(tcdsNumber)}`,
      `${FAA_API_BASE}/aircraft/tcds?tcdsNumber=${encodeURIComponent(tcdsNumber)}`,
      `${FAA_API_BASE}/certification/tcds/${encodeURIComponent(tcdsNumber)}`
    ];

    for (const endpoint of endpoints) {
      console.log(`Trying: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TCDS-Lookup-Client/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Success for ${tcdsNumber}:`, data);
        return data;
      } else {
        console.log(`Failed ${response.status}: ${endpoint}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up ${tcdsNumber}:`, error);
    return null;
  }
}

async function main() {
  const results: Record<string, any> = {};
  
  console.log('Starting FAA API TCDS lookup...');
  
  for (const tcdsNumber of tcdsNumbers.slice(0, 3)) { // Test with first 3
    console.log(`\nLooking up: ${tcdsNumber}`);
    const result = await lookupTcdsViaAPI(tcdsNumber);
    
    if (result) {
      results[tcdsNumber] = result;
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Save results
  fs.writeFileSync('tcds-results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to tcds-results.json');
  console.log('Found data for:', Object.keys(results));
}

main().catch(console.error);