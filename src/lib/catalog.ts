import { createClient } from '@supabase/supabase-js';
import { createCatalogRepository, type CatalogGateway } from './catalogRepository';
import { readPublicConfig } from './publicConfig';
import type { Database, TCDSCatalogRow } from './database.types';
import type { CatalogDocument } from '../domain/catalog';

const config = readPublicConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const toDocument = (row: TCDSCatalogRow): CatalogDocument => ({
  ...row, revision_date: row.revision_date ?? '', holder: row.holder ?? undefined,
});

function gateway(): CatalogGateway | null {
  if (!config) return null;
  const client = createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
  return {
    async list() {
      const { data, error } = await client.rpc('search_tcds', { search_query: '', result_limit: 20 });
      if (error) throw new Error('Catalog unavailable');
      return (data ?? []).map(toDocument);
    },
    async get(number) {
      const { data, error } = await client.from('tcds_catalog').select('*').eq('authority','FAA').eq('tcds_number',number).maybeSingle();
      if (error) throw new Error('Catalog unavailable');
      return data ? toDocument(data) : null;
    },
  };
}

export const catalog = createCatalogRepository(gateway());
