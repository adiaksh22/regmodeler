import {describe,expect,it,vi} from 'vitest';
import {createReadCache} from './readCache';
describe('bounded shared reads',()=>{
 it('deduplicates pending reads, reuses successes and expires them',async()=>{
  let time=0;const cache=createReadCache({ttlMs:100,now:()=>time});const load=vi.fn(async()=>42);
  const first=cache.read('scope',load);expect(cache.read('scope',load)).toBe(first);expect(await first).toBe(42);
  time=99;await cache.read('scope',load);expect(load).toHaveBeenCalledTimes(1);
  time=100;await cache.read('scope',load);expect(load).toHaveBeenCalledTimes(2);
 });
 it('evicts failures and never reinstates an invalidated in-flight read',async()=>{
  const cache=createReadCache();let finish!:(value:string)=>void;
  const old=cache.read('a',()=>new Promise<string>(resolve=>{finish=resolve;}));await Promise.resolve();cache.invalidate('a');
  expect(await cache.read('a',async()=>'new')).toBe('new');finish('old');await old;expect(await cache.read('a',async()=>'wrong')).toBe('new');
  await expect(cache.read('failed',async()=>{throw Error('failed');})).rejects.toThrow();expect(await cache.read('failed',async()=>'recovered')).toBe('recovered');
 });
 it('limits retained entries while keeping unrelated certificate data',async()=>{
  const cache=createReadCache({maxEntries:2});const load=vi.fn(async()=>1);
  await cache.read('one',load);await cache.read('two',load);await cache.read('three',load);await cache.read('one',load);expect(load).toHaveBeenCalledTimes(4);
  cache.invalidate('three');await cache.read('one',load);expect(load).toHaveBeenCalledTimes(4);
 });
});
