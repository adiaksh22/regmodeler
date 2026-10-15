import {beforeEach,describe,it,expect,vi} from 'vitest';
import {readProfiles,writeProfiles,emptyProfiles,PROFILE_KEY,profileStoreFingerprint} from './profileStorage';
const profile={id:'profile-test',model:'PA-28-140',name:'Test aircraft',serial:'',modifications:[],updatedAt:'2026-10-14T00:00:00Z'};
beforeEach(()=>{localStorage.clear();vi.restoreAllMocks();});
describe('browser profile preservation',()=>{
  it('round trips profiles for both models and never changes source notes',()=>{
    localStorage.setItem('tcds_cross_references','keep');const other={...profile,id:'second',model:'PA-28-181'};
    expect(writeProfiles({schemaVersion:1,profiles:[profile,other],activeIds:{'PA-28-140':profile.id,'PA-28-181':other.id}})).toBe(true);
    expect(readProfiles().store.profiles).toHaveLength(2);expect(localStorage.getItem('tcds_cross_references')).toBe('keep');
  });
  it('reads older profiles without equipment and preserves reviewed equipment entries',()=>{
    localStorage.setItem(PROFILE_KEY,JSON.stringify({schemaVersion:1,profiles:[profile],activeIds:{'PA-28-140':profile.id}}));
    expect(readProfiles().store.profiles[0].equipment).toEqual([]);
    const equipment={...profile,equipment:[{key:'GARMIN:GTX33-33D-330-330D',status:'installed' as const,note:'Avionics list'}]};
    expect(writeProfiles({schemaVersion:1,profiles:[equipment],activeIds:{'PA-28-140':profile.id}})).toBe(true);
    expect(readProfiles().store.profiles[0].equipment).toEqual(equipment.equipment);
  });
  it('preserves corrupt or future-version data instead of silently overwriting it',()=>{
    for(const raw of ['{',JSON.stringify({schemaVersion:2,profiles:[],activeIds:{}}),JSON.stringify({schemaVersion:1,profiles:[{...profile,serial:42}],activeIds:{}})]){
      localStorage.setItem(PROFILE_KEY,raw);expect(readProfiles().writable).toBe(false);expect(localStorage.getItem(PROFILE_KEY)).toBe(raw);
    }
  });
  it('handles blocked and full browser storage without claiming that a save worked',()=>{
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('full');});expect(writeProfiles(emptyProfiles())).toBe(false);
    vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});expect(readProfiles().writable).toBe(false);
  });
  it('compares saved values independent of JSON property order and detects actual conflicting edits',()=>{
    const store={schemaVersion:1 as const,profiles:[profile],activeIds:{'PA-28-140':profile.id}};
    writeProfiles(store);expect(profileStoreFingerprint(readProfiles().store)).toBe(profileStoreFingerprint(store));
    expect(profileStoreFingerprint({...store,profiles:[{...profile,name:'Changed elsewhere'}]})).not.toBe(profileStoreFingerprint(store));
  });
});
