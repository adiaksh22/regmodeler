import { TCDSDocument } from '../types/tcds';

export const tcdsMetadata: Record<string, Omit<TCDSDocument, 'tcds_number' | 'url'>> = {
  'P19NE': {
    model: 'MTV-6-( )',
    revision: '8',
    revision_date: '07/08/2021',
    status: 'current',
    holder: 'MT-Propeller Entwicklung GmbH'
  },
  'E7CE': {
    model: 'IO-360-L2A',
    revision: '23',
    revision_date: '03/15/2023',
    status: 'current',
    holder: 'Textron Lycoming'
  },
  'A14SO': {
    model: 'SR20',
    revision: '31',
    revision_date: '11/20/2023',
    status: 'current',
    holder: 'Cirrus Design Corporation'
  },
  'A-804': {
    model: '172S',
    revision: '78',
    revision_date: '09/28/2023',
    status: 'current',
    holder: 'Textron Aviation Inc.'
  },
  '2A13': {
    model: 'Model 206',
    revision: '112',
    revision_date: '11/13/2024',
    status: 'current',
    holder: 'Textron Aviation Inc.'
  },
  'A28NM': {
    model: 'DA40',
    revision: '25',
    revision_date: '12/05/2024',
    status: 'current',
    holder: 'Diamond Aircraft Industries GmbH'
  }
};

export const getMetadata = (tcdsNumber: string): Omit<TCDSDocument, 'tcds_number' | 'url'> | null => {
  return tcdsMetadata[tcdsNumber.toUpperCase()] || null;
};
