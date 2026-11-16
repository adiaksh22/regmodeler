import { createCatalogRepository, catalogSearchLimit, type CatalogGateway } from './catalogRepository';
import {publicCatalogClient} from './publicClient';
import type { TCDSCatalogRow } from './database.types';
import type { CatalogDocument } from '../domain/catalog';
import type { ApplicabilityRule, OfficialRevision, RegulationSource } from '../domain/explorer';

const toDocument = (row: TCDSCatalogRow): CatalogDocument => ({
  ...row, revision_date: row.revision_date ?? '', holder: row.holder ?? undefined,
});

function gateway(): CatalogGateway | null {
  const client=publicCatalogClient;if(!client)return null;
  return {
    async list(query = '') {
      const { data, error } = await client.rpc('search_tcds', { search_query: query, result_limit: catalogSearchLimit });
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

function publicClient() {
  return publicCatalogClient;
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
