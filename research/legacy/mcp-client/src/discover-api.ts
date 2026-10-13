import fetch from 'node-fetch';

async function discoverFAAAPI() {
  const baseUrls = [
    'https://api.faa.gov',
    'https://api.faa.gov/faaDataService',
    'https://api.faa.gov/faaDataService/v1',
    'https://api.faa.gov/faaDataService/v2',
    'https://registry.faa.gov/api',
    'https://drs.faa.gov/api'
  ];

  console.log('Discovering FAA API endpoints...\n');

  for (const baseUrl of baseUrls) {
    try {
      console.log(`Testing: ${baseUrl}`);
      
      const response = await fetch(baseUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'API-Discovery/1.0'
        }
      });

      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        console.log(`Content-Type: ${contentType}`);
        
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.log('Response:', JSON.stringify(data, null, 2));
        } else {
          const text = await response.text();
          console.log('Response (first 200 chars):', text.substring(0, 200));
        }
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`Error: ${error.message}\n---\n`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

discoverFAAAPI().catch(console.error);