import { tcdsSamples } from '../data/tcdsSamples';
import type { CatalogDocument, CatalogResult } from '../domain/catalog';

export interface CatalogGateway {
  list(query?: string): Promise<CatalogDocument[]>;
  get(number: string): Promise<CatalogDocument | null>;
}

const samples: CatalogDocument[] = tcdsSamples.map(sample => ({ ...sample, authority: 'FAA' }));
const fallbackNotice = 'The online catalog is unavailable. Showing saved FAA demo snapshots.';

export function createCatalogRepository(gateway: CatalogGateway | null = null) {
  return {
    async list(query = ''): Promise<CatalogResult<CatalogDocument[]>> {
      const normalized=query.trim().toLowerCase();
      const matching=samples.filter(doc=>[doc.tcds_number,doc.model,doc.holder??''].some(value=>value.toLowerCase().includes(normalized)));
      if (!gateway) return { data: matching, source: 'sample' };
      try { return { data: await gateway.list(query.trim()), source: 'database' }; }
      catch { return { data: matching, source: 'fallback', notice: fallbackNotice }; }
    },
    async get(number: string): Promise<CatalogResult<CatalogDocument | null>> {
      const normalized = number.trim().toUpperCase();
      const sample = samples.find(sample => sample.tcds_number === normalized) ?? null;
      if (!gateway) return { data: sample, source: 'sample' };
      try { return { data: await gateway.get(normalized), source: 'database' }; }
      catch { return { data: sample, source: 'fallback', notice: fallbackNotice }; }
    },
  };
}
