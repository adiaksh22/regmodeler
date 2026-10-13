export function parseCSV(csvText: string) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
    });
    
    return obj;
  });
}

export async function loadAircraftData() {
  try {
    const response = await fetch('/aircraft-data.csv');
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading aircraft data:', error);
    return [];
  }
}