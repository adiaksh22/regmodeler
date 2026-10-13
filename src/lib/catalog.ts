import { createClient } from '@supabase/supabase-js';
import { createCatalogRepository, type CatalogGateway } from './catalogRepository';
import { readPublicConfig } from './publicConfig';
import type { Database, TCDSCatalogRow } from './database.types';
import type { CatalogDocument } from '../domain/catalog';
import type { ExplorerDetails } from '../domain/explorer';

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
    async list(query = '') {
      const { data, error } = await client.rpc('search_tcds', { search_query: query, result_limit: 20 });
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

export async function loadExplorerDetails(number: string): Promise<ExplorerDetails> {
  const empty = { revisions: [], relationships: [], lastChecked: null, available: false };
  if (!config) return { ...empty, notice: 'Connect the shared catalog to load imported revisions and reviewed relationships.' };
  const client = createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
  try {
    const [versions, relationships, checked] = await Promise.all([
      client.from('tcds_versions').select('*').eq('tcds_number',number.toUpperCase()).order('revision_date',{ascending:false}).order('retrieved_at',{ascending:false}),
      client.from('tcds_relationships').select('*').eq('tcds_number',number.toUpperCase()).order('target'),
      client.rpc('catalog_last_checked',{p_number:number.toUpperCase()}),
    ]);
    if (versions.error || relationships.error || checked.error) throw new Error('Unavailable');
    return { revisions: versions.data ?? [], relationships: relationships.data ?? [], lastChecked: checked.data, available: true };
  } catch { return { ...empty, notice: 'Imported history and relationships are temporarily unavailable. Reload to try again.' }; }
}
