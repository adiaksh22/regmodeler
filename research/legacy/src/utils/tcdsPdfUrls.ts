// TCDS PDF URL mapping - needs to be populated with actual PDF URLs
const tcdsPdfMap: Record<string, string> = {
  'ATC 42 Textron Lycoming': 'https://drs.faa.gov/browse/excelExternalWindow/0001847EDB0CEBC6862572C0006DF231.0001',
  'P19NE': 'https://drs.faa.gov/browse/excelExternalWindow/65F15764601662218625870C00615523.0001',
  'E7CE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID148994589720230223190439.0001',
  'TC 653': 'https://drs.faa.gov/browse/excelExternalWindow/2A14A98048AD259185256732004CC273.0001',
  'A14SO': 'https://drs.faa.gov/browse/excelExternalWindow/E7C26AA9AFF64B19862577AB0068F180.0001',
  'E4IN': 'https://drs.faa.gov/browse/excelExternalWindow/B3F869AEB5125DDD862588C6006584BE.0001',
  'E5NE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID172085135620231129203524.0001',
  'E-274': 'https://drs.faa.gov/browse/excelExternalWindow/74C397F0D8FA23B886257B63006BA6A4.0001',
  'A-804': 'https://drs.faa.gov/browse/excelExternalWindow/E0F93CB70D35CD3D862582B000711E18.0001',
  'H5EU': 'https://drs.faa.gov/browse/excelExternalWindow/0055C6C3A81C26CA852567150063E527.0001',
  'TC 534': 'https://drs.faa.gov/browse/excelExternalWindow/00563BC477C1164F8525676A0062B84B.0001',
  'A10SW': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID117770915220230412140907.0001',
  'A00010WI': 'https://drs.faa.gov/browse/excelExternalWindow/6B9B373799E138BE862585BB0064BA05.0001',
  'A16SO': 'https://drs.faa.gov/browse/excelExternalWindow/00617D2BC06FF1908525673F00623C50.0001',
  'E00069EN': 'https://drs.faa.gov/browse/excelExternalWindow/6090A0C0AF2245CF8625887C0049BD46.0001',
  '2A13': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID125895332520251113164724.0001',
  'G17CE': 'https://drs.faa.gov/browse/excelExternalWindow/0084B54070EC232A8625879E0073F2FE.0001',
  'A41EU': 'https://drs.faa.gov/browse/excelExternalWindow/2AFED1F41EABF2CB8625848700475D3C.0001',
  'A-684': 'https://drs.faa.gov/browse/excelExternalWindow/00900B34D67162AA862581EF0060CBBF.0001',
  'A19SW': 'https://drs.faa.gov/browse/excelExternalWindow/AC332AD5CE2639AE8625856E006048BA.0001',
  'P6NE': 'https://drs.faa.gov/browse/excelExternalWindow/460300476FDCBDC88625729F006C2802.0001',
  'H4NM': 'https://drs.faa.gov/browse/excelExternalWindow/00ABB6F558F0A642862586B700704EC0.0001',
  'E3GL': 'https://drs.faa.gov/browse/excelExternalWindow/AC49FCB970D466AE862586CE005B4BC0.0001',
  'P41EA': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID122358187620250404133130.0001',
  'A00073CE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID162442222620250318142854.0001',
  '4A20': 'https://drs.faa.gov/browse/excelExternalWindow/00B5872A808175A88525673E00645DDA.0001',
  'P28EA': 'https://drs.faa.gov/browse/excelExternalWindow/00B59BF7FF22A0E986257DEF006FC287.0001',
  'ATC 201': 'https://drs.faa.gov/browse/excelExternalWindow/00B9E706BF9EBF518525673E00684658.0001',
  'A28NM': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID167280873920251205175601.0001',
  'P27EA': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID164052437020250403142746.0001',
  'A00007SE': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID128562299920251125193447.0001',
  'R00004RC': 'https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID131628022620250430185304.0001',
};

// Function to get direct PDF URL or fallback to search
const getTcdsPdfUrl = (tcdsNumber: string): string => {
  const pdfUrl = tcdsPdfMap[tcdsNumber] || tcdsPdfMap[tcdsNumber.toUpperCase()];
  if (pdfUrl) {
    return pdfUrl;
  }
  // Fallback to FAA DRS search
  return `https://drs.faa.gov/`;
};

export { tcdsPdfMap, getTcdsPdfUrl };