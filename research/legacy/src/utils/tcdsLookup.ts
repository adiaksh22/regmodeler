// Utility script to help find TCDS document IDs
// This script can be run in the browser console on the FAA DRS site

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

console.log('TCDS Numbers to search for:');
console.log(tcdsNumbers);

// Instructions for manual lookup
console.log(`
To find document IDs:
1. Go to https://drs.faa.gov/browse/excel
2. Search for each TCDS number
3. Click on the result to get the document URL
4. Extract the document ID from the URL
5. Update the tcdsDocumentMap in CertificationTable.tsx

Example:
URL: https://drs.faa.gov/browse/excelExternalWindow/645D3F23BFADD8D686257EC80066D41D.0001
Document ID: 645D3F23BFADD8D686257EC80066D41D.0001
`);

export { tcdsNumbers };