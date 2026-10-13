import { describe, expect, it } from 'vitest';
import { createCatalogRepository } from './catalogRepository';

describe('catalog availability boundaries', () => {
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
