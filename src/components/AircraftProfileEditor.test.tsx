import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import AircraftProfileEditor from './AircraftProfileEditor';
import {PROFILE_KEY,writeProfiles,readProfiles,profileStoreFingerprint} from '../lib/profileStorage';
import {DRAFT_PREFIX,clearProfileDraft,writeProfileDraft} from '../lib/profileDrafts';
const saved={id:'saved-140',model:'PA-28-140',name:'Saved aircraft',serial:'28-20001',equipment:[],modifications:[],updatedAt:'2026-11-16T00:00:00Z'};
let host:HTMLDivElement,root:Root;const change=vi.fn();
async function render(model='PA-28-140'){await act(async()=>root.render(<AircraftProfileEditor key={model} model={model} equipmentOptions={[]} onChange={change}/>));}
async function edit(label:string,value:string){await act(async()=>{const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
async function click(label:string){await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent===label)!.click());}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.restoreAllMocks();localStorage.clear();sessionStorage.clear();clearProfileDraft('PA-28-140',true);clearProfileDraft('PA-28-181',true);change.mockReset();vi.spyOn(window,'confirm').mockReturnValue(true);
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
describe('profile draft recovery and saved relevance',()=>{
 it('recovers incomplete edits after unmount while relevance stays on the saved profile',async()=>{
  writeProfiles({schemaVersion:1,profiles:[saved],activeIds:{'PA-28-140':saved.id}});await render();
  await edit('Aircraft profile name','Unfinished aircraft');await edit('Aircraft serial number','28-');await click('Add STC entry');
  expect(change).toHaveBeenLastCalledWith(saved);expect(readProfiles().store.profiles[0].name).toBe(saved.name);
  await act(async()=>root.render(null));await render();
  expect(host.querySelector<HTMLInputElement>('[aria-label="Aircraft profile name"]')!.value).toBe('Unfinished aircraft');expect(host.querySelector<HTMLInputElement>('[aria-label="STC number 1"]')!.value).toBe('');
  expect(host.textContent).toContain('Recovered an unsaved draft');expect(host.querySelector('details')!.open).toBe(true);expect(change).toHaveBeenLastCalledWith(saved);
 });
 it('keeps per-model drafts across switches and clears only a deliberately discarded draft',async()=>{
  await render();await edit('Aircraft profile name','First draft');await render('PA-28-181');await edit('Aircraft profile name','Second draft');await render();
  expect(host.querySelector<HTMLInputElement>('[aria-label="Aircraft profile name"]')!.value).toBe('First draft');
  await click('Discard draft');expect(sessionStorage.getItem(DRAFT_PREFIX+'PA-28-140')).toBeNull();expect(sessionStorage.getItem(DRAFT_PREFIX+'PA-28-181')).not.toBeNull();
 });
 it('saves a valid draft explicitly and clears its backup',async()=>{
  await render();await edit('Aircraft profile name','Explicit saved aircraft');await click('Save and use profile');
  expect(readProfiles().store.profiles[0].name).toBe('Explicit saved aircraft');expect(sessionStorage.getItem(DRAFT_PREFIX+'PA-28-140')).toBeNull();expect(host.textContent).not.toContain('Unsaved edits.');expect(change.mock.calls.at(-1)![0].name).toBe('Explicit saved aircraft');
 });
 it('refuses to overwrite newer profiles when an older draft is recovered',async()=>{
  const old={schemaVersion:1 as const,profiles:[saved],activeIds:{'PA-28-140':saved.id}};writeProfiles(old);
  writeProfileDraft({schemaVersion:1,profile:{...saved,name:'Older unfinished edit'},baseFingerprint:profileStoreFingerprint(old)});
  writeProfiles({...old,profiles:[{...saved,name:'Newer saved elsewhere'}]});const before=localStorage.getItem(PROFILE_KEY);
  await render();await click('Save and use profile');expect(host.textContent).toContain('changed since this draft was started');expect(localStorage.getItem(PROFILE_KEY)).toBe(before);
  await click('Reload saved profiles');expect(host.querySelector<HTMLInputElement>('[aria-label="Aircraft profile name"]')!.value).toBe('Newer saved elsewhere');expect(sessionStorage.getItem(DRAFT_PREFIX+'PA-28-140')).toBeNull();
 });
 it('keeps an in-memory draft across route unmounts and guards reload if tab storage fails',async()=>{
  await render();const original=Storage.prototype.setItem;
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(this:Storage,key,value){if(this===sessionStorage)throw Error('full');original.call(this,key,value);});
  await edit('Aircraft profile name','Memory draft');expect(host.textContent).toContain('Draft backup is unavailable');
  await act(async()=>root.render(null));const leave=new Event('beforeunload',{cancelable:true});window.dispatchEvent(leave);expect(leave.defaultPrevented).toBe(true);
  await render();expect(host.querySelector<HTMLInputElement>('[aria-label="Aircraft profile name"]')!.value).toBe('Memory draft');
  vi.restoreAllMocks();await click('Save and use profile');expect(readProfiles().store.profiles[0].name).toBe('Memory draft');
 });
});
