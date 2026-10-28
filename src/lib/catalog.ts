import { createClient } from '@supabase/supabase-js';
import { createCatalogRepository, type CatalogGateway } from './catalogRepository';
import { readPublicConfig } from './publicConfig';
import type { Database, TCDSCatalogRow } from './database.types';
import type { CatalogDocument } from '../domain/catalog';
import type { ApplicabilityRule, ExplorerDetails, OfficialRevision, RegulationSource } from '../domain/explorer';

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
    const [relationships, checked, variants] = await Promise.all([
      client.from('model_graph').select('*').eq('tcds_number',number.toUpperCase()).order('target'),
      client.rpc('source_monitoring'),
      client.from('aircraft_variant_catalog').select('*').eq('tcds_number',number.toUpperCase()).order('display_name'),
    ]);
    if (relationships.error || checked.error || variants.error) throw new Error('Unavailable');
    return { revisions: [], relationships: relationships.data ?? [], lastChecked: checked.data?.find(row=>row.source==='FAA:TCDSMODEL:'+number.toUpperCase())?.last_success??null, available: true, variants: variants.data??[],monitoring:checked.data??[] };
  } catch { return { ...empty, notice: 'Imported history and relationships are temporarily unavailable. Reload to try again.' }; }
}

function publicClient() {
  return config ? createClient<Database>(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  }) : null;
}

export async function loadRevisionHistory(number:string):Promise<OfficialRevision[]> {
  const client=publicClient();if(!client)return [];
  const result=await client.from('tcds_versions').select('*').eq('tcds_number',number.toUpperCase()).order('revision_date',{ascending:false}).order('retrieved_at',{ascending:false});
  if(result.error)throw new Error('Revision history unavailable');
  return result.data??[];
}

export async function loadRelationshipEvidence(relationshipId:string,basisKey?:string):Promise<{rules:ApplicabilityRule[];materials:RegulationSource[]}> {
  const client=publicClient();if(!client)return {rules:[],materials:[]};
  const [rules,materials]=await Promise.all([
    client.from('relationship_applicability_rules').select('*').eq('relationship_id',relationshipId).order('group_order').order('predicate_order'),
    basisKey?client.from('regulation_sources').select('*').eq('basis_key',basisKey):Promise.resolve({data:[] as RegulationSource[],error:null}),
  ]);
  if(rules.error||materials.error)throw new Error('Evidence details unavailable');
  return {rules:rules.data??[],materials:materials.data??[]};
}
