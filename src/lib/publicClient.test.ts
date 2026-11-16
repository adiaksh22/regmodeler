import {afterEach,describe,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules();});
describe('interactive request budget',()=>{
 it('uses one bounded SDK attempt for a transient read failure',async()=>{
  vi.resetModules();vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','sb_publishable_browser_test');
  const fetch=vi.fn(async()=>new Response('{"message":"simulated unavailable"}',{status:503,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetch);
  const {publicCatalogClient}=await import('./publicClient');
  const result=await publicCatalogClient!.from('tcds_catalog').select('*');
  expect(result.error).toBeTruthy();expect(fetch).toHaveBeenCalledTimes(1);
  const init=fetch.mock.calls[0] as unknown as [unknown,RequestInit];expect(init[1].signal).toBeDefined();
 });
});
