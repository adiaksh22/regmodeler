import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import PersonalCrossReferences from './PersonalCrossReferences';
import {catalog} from '../lib/catalog';
import {CROSS_REF_KEY,createGroup,listGroups} from '../utils/crossReferenceManager';
vi.mock('../lib/catalog',()=>({catalog:{get:vi.fn()}}));
let host:HTMLDivElement,root:Root;
async function render(number='2A13'){await act(async()=>root.render(<MemoryRouter><PersonalCrossReferences key={number} number={number}/></MemoryRouter>));}
async function input(value:string){await act(async()=>{const field=host.querySelector('input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});}
async function submit(){await act(async()=>{host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});}
async function click(label:string){await act(async()=>[...host.querySelectorAll('button')].find(node=>node.textContent===label)!.click());}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.clearAllMocks();localStorage.clear();vi.mocked(catalog.get).mockResolvedValue({source:'database',data:null});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
describe('personal link interface',()=>{
 it('rejects self/invalid/duplicate inputs without catalog requests',async()=>{
  createGroup(['2A13','A16WE']);await render();
  for(const value of ['2a13','not a certificate','a16we']){await input(value);await submit();expect(host.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');}
  expect(catalog.get).not.toHaveBeenCalled();expect(listGroups()).toHaveLength(1);
 });
 it('creates a navigable personal bookmark with explicit unsupported-catalog guidance',async()=>{
  await render();await input(' zz999 ');await submit();
  expect(catalog.get).toHaveBeenCalledExactlyOnceWith('ZZ999');expect(host.querySelector('a')!.getAttribute('href')).toBe('/tcds/ZZ999');expect(host.textContent).toContain('not included in this app’s catalog');expect(listGroups()[0].members).toEqual(['2A13','ZZ999']);
 });
 it('previews target group membership before joining groups and supports removal/Undo',async()=>{
  createGroup(['2A13','A16WE']);createGroup(['3A12','E00088EN']);await render();await input('3a12');
  expect(host.textContent).toContain('also joins its personal group: E00088EN');expect(host.textContent).toContain('Join groups and link');
  await submit();expect(listGroups()).toHaveLength(1);expect(host.querySelectorAll('[aria-label="Linked TCDS certificates"] a')).toHaveLength(3);
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Remove A16WE from personal group"]')!.click());
  expect(host.textContent).toContain('Undo is available');expect(document.activeElement).toBe(host.querySelector('input'));
  await click('Undo removal');expect(listGroups()[0].members).toContain('A16WE');
 });
 it('cancels a pending lookup when leaving the component and preserves concurrent changes',async()=>{
  let resolve!:(value:{source:'database';data:null})=>void;vi.mocked(catalog.get).mockReturnValue(new Promise(done=>{resolve=done;}));
  await render();await input('A16WE');await submit();await act(async()=>root.render(null));await act(async()=>resolve({source:'database',data:null}));expect(listGroups()).toEqual([]);
  vi.mocked(catalog.get).mockResolvedValue({source:'database',data:null});await render();await input('A16WE');createGroup(['3A12','E00088EN']);await submit();
  expect(host.textContent).toContain('changed in another window');expect(listGroups()[0].members).toEqual(['3A12','E00088EN']);
 });
 it('preserves corrupt records and reports failed writes without claiming success',async()=>{
  localStorage.setItem(CROSS_REF_KEY,'{keep');await render();expect(host.querySelector('input')!.disabled).toBe(true);expect(host.textContent).toContain('preserved');expect(localStorage.getItem(CROSS_REF_KEY)).toBe('{keep');
  localStorage.removeItem(CROSS_REF_KEY);await click('Reload personal links');await input('A16WE');vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});await submit();
  expect(host.textContent).toContain('could not be saved');expect(host.textContent).not.toContain('Personal link saved');expect(localStorage.getItem(CROSS_REF_KEY)).toBeNull();
 });
});
