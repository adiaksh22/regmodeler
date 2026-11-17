import {afterEach,describe,it,expect,vi} from 'vitest';
import {getOriginalLink} from './relatedCatalog';
import {ArchiveRateLimitError} from '../domain/archiveAccess';
vi.mock('./publicClient',()=>({publicCatalogConfig:{url:'https://fixture.supabase.co',publishableKey:'sb_publishable_fixture'},publicCatalogClient:null}));
afterEach(()=>vi.unstubAllGlobals());
describe('archived source access failures',()=>{
 it('uses a bounded retry delay without exposing server failure details',async()=>{
  for(const [header,delay] of [['42',42],['-1',60],['999999',60],['not a number',60]] as const){
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"private":"details"}',{status:429,headers:{'Retry-After':header}})));
   await expect(getOriginalLink('version')).rejects.toMatchObject({retryAfter:delay});
  }
 });
 it('does not confuse a service outage with a traffic limit',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));
  try{await getOriginalLink('version');throw Error('Expected rejection');}catch(error){expect(error).not.toBeInstanceOf(ArchiveRateLimitError);expect((error as Error).message).toBe('Source viewer unavailable');}
 });
 it('retains same-origin validation for successful links',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({url:'https://external.invalid/file.pdf'}))));
  await expect(getOriginalLink('version')).rejects.toThrow('Invalid source link');
 });
});
