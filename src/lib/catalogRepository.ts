import { tcdsSamples } from '../data/tcdsSamples';
import type { CatalogDocument, CatalogResult } from '../domain/catalog';

export interface CatalogGateway {
  list(): Promise<CatalogDocument[]>;
  get(number: string): Promise<CatalogDocument | null>;
}

const samples: CatalogDocument[] = tcdsSamples.map(sample => ({ ...sample, authority: 'FAA' }));
const fallbackNotice = 'The online catalog is unavailable. Showing saved FAA demo snapshots.';

export function createCatalogRepository(gateway: CatalogGateway | null = null) {
  return {
    async list(): Promise<CatalogResult<CatalogDocument[]>> {
      if (!gateway) return { data: samples, source: 'sample' };
      try { return { data: await gateway.list(), source: 'database' }; }
      catch { return { data: samples, source: 'fallback', notice: fallbackNotice }; }
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
