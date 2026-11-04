import {describe,expect,it,vi} from 'vitest';
import {guardBrowserStorage} from './guardBrowserStorage';
describe('browser startup storage permissions',()=>{
 it('leaves readable storage unchanged and never writes a probe',()=>{
  const storage={getItem:vi.fn(()=>null),setItem:vi.fn()};const target={localStorage:storage};guardBrowserStorage(target);expect(target.localStorage).toBe(storage);expect(storage.setItem).not.toHaveBeenCalled();
 });
 it('contains read-denied/write-allowed dependency initialization without changing saved data',()=>{
  const original={getItem:()=>{throw Error('read denied');},data:'preserve original bytes'};const target={localStorage:original};guardBrowserStorage(target);expect(()=>target.localStorage).toThrow('Browser storage is unavailable');expect(original.data).toBe('preserve original bytes');
 });
 it('tolerates browser-enforced non-configurable denial',()=>{
  const target={} as {readonly localStorage:Storage};Object.defineProperty(target,'localStorage',{get(){throw Error('denied');},configurable:false});expect(()=>guardBrowserStorage(target)).not.toThrow();expect(()=>target.localStorage).toThrow('denied');
 });
});
