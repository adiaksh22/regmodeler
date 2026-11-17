import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readProfileDraft,writeProfileDraft,clearProfileDraft,DRAFT_PREFIX,type ProfileDraft} from './profileDrafts';
const draft=(model='PA-28-140'):ProfileDraft=>({schemaVersion:1,baseFingerprint:'saved-version',profile:{id:'draft-one',model,name:'',serial:'28-',modifications:[{number:'',status:'unknown',note:'Not finished'}],equipment:[],updatedAt:'2026-11-16T00:00:00Z'}});
beforeEach(()=>{vi.restoreAllMocks();sessionStorage.clear();clearProfileDraft('PA-28-140',true);clearProfileDraft('PA-28-181',true);});
afterEach(()=>vi.restoreAllMocks());
describe('tab-local recoverable profile drafts',()=>{
 it('preserves incomplete edits by model without changing saved profiles',()=>{
  localStorage.setItem('regmodeler_aircraft_profiles_v1','keep');
  expect(writeProfileDraft(draft())).toBe(true);expect(writeProfileDraft(draft('PA-28-181'))).toBe(true);
  expect(readProfileDraft('PA-28-140').record).toEqual(draft());expect(readProfileDraft('PA-28-181').record?.profile.model).toBe('PA-28-181');
  expect(readProfileDraft('PA-28-140').backedUp).toBe(true);expect(localStorage.getItem('regmodeler_aircraft_profiles_v1')).toBe('keep');
  expect(clearProfileDraft('PA-28-140')).toBe(true);expect(readProfileDraft('PA-28-181').record).not.toBeNull();
 });
 it('retains a memory fallback when session storage is full or blocked',()=>{
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('full');});
  expect(writeProfileDraft(draft())).toBe(false);expect(readProfileDraft('PA-28-140').record).toEqual(draft());expect(readProfileDraft('PA-28-140').backedUp).toBe(false);
  const leave=new Event('beforeunload',{cancelable:true});window.dispatchEvent(leave);expect(leave.defaultPrevented).toBe(true);
  vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('blocked');});
  expect(readProfileDraft('PA-28-140').record).toEqual(draft());
  vi.restoreAllMocks();clearProfileDraft('PA-28-140',true);const safeLeave=new Event('beforeunload',{cancelable:true});window.dispatchEvent(safeLeave);expect(safeLeave.defaultPrevented).toBe(false);
 });
 it('does not overwrite or silently clear malformed backups',()=>{
  for(const raw of ['{broken','null',JSON.stringify({...draft(),schemaVersion:2}),JSON.stringify({...draft(),profile:{...draft().profile,name:42}})]){
   sessionStorage.setItem(DRAFT_PREFIX+'PA-28-140',raw);expect(readProfileDraft('PA-28-140').writable).toBe(false);
   expect(writeProfileDraft(draft())).toBe(false);expect(clearProfileDraft('PA-28-140')).toBe(false);expect(sessionStorage.getItem(DRAFT_PREFIX+'PA-28-140')).toBe(raw);
   expect(clearProfileDraft('PA-28-140',true)).toBe(true);
  }
 });
 it('rejects wrong models, oversized entries and malformed statuses',()=>{
  for(const record of [draft('737-800'),{...draft(),profile:{...draft().profile,name:'x'.repeat(81)}},{...draft(),profile:{...draft().profile,modifications:[{number:'',note:'',status:'bad'}]}}])expect(writeProfileDraft(record as ProfileDraft)).toBe(false);
  expect(readProfileDraft('PA-28-140').record).toBeNull();
 });
});
