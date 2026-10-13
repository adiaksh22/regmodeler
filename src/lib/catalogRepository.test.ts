import { describe, expect, it } from 'vitest';
import { createCatalogRepository } from './catalogRepository';

describe('catalog availability boundaries', () => {
  it('searches model and holder and forwards the query to the shared catalog', async () => {
    expect((await createCatalogRepository().list('pa-28-181')).data.map(d=>d.tcds_number)).toEqual(['2A13']);
    expect((await createCatalogRepository().list('Continental')).data.map(d=>d.tcds_number)).toEqual(['E7CE']);
    expect((await createCatalogRepository().list('not-a-model')).data).toEqual([]);
    let query='';
    await createCatalogRepository({list:async value=>{query=value??'';return [];},get:async()=>null}).list(' PA-28 ');
    expect(query).toBe('PA-28');
  });
  it('provides verified snapshots without cloud configuration', async () => {
    const result = await createCatalogRepository().get(' 2a13 ');
    expect(result.source).toBe('sample');
    expect(result.data?.holder).toBe('Piper Aircraft Inc.');
  });
  it('does not replace a database miss with a stale sample', async () => {
    const gateway = { list: async () => [], get: async () => null };
    expect(await createCatalogRepository(gateway).get('2A13')).toEqual({ data: null, source: 'database' });
  });
  it('labels snapshot fallback when the API is unavailable', async () => {
    const fail = async (): Promise<never> => { throw new Error('outage'); };
    const repository = createCatalogRepository({ list: fail, get: fail });
    const result = await repository.list();
    expect(result.source).toBe('fallback');
    expect(result.notice).toMatch(/unavailable/);
    expect(result.data).toHaveLength(3);
    expect((await repository.get('unknown')).data).toBeNull();
  });
});
