import batch4 from '../../apps/worker/src/review-batch4.json';
import batch5 from '../../apps/worker/src/review-batch5.json';
import {describe,it,expect} from 'vitest';
import {profileRelevance,validateProfile,type AircraftProfile} from './aircraftProfile';
import type {EvidenceRelationship} from './explorer';
const profile:AircraftProfile={id:'profile-test',model:'PA-28-140',name:'Test aircraft',serial:'28-20001',modifications:[],updatedAt:'2026-10-14T00:00:00Z'};
const edge:EvidenceRelationship={id:'edge',tcds_number:'2A13',model:'PA-28-140',target:'AD 2020-24-05',target_type:'certificate',relationship_type:'applies_to',evidence_page:5,evidence_excerpt:'Reviewed fixture',applicability_conditions:{serial_ranges:'28-20001 through 28-26946; 28-7125001 through 28-7725290.'},evidence_revision:'2020-11-13',source_url:'https://drs.faa.gov/',source_document_type:'AD',source_document_number:'2020-24-05'};
describe('reviewed profile relevance',()=>{
  it('keeps reviewed component serial gaps and equipment-only scope distinct',()=>{
    const p={...profile,model:'PA-28-181'};
    const reviewed=(number:string)=>({...edge,model:p.model,applicability_conditions:Object.fromEntries(Object.entries(batch4.find(e=>e.number===number)!.conditions).filter(([,value])=>typeof value==='string'))});
    for(const serial of ['2843021','2843768','2843769','2843775','2843779','2843791'])expect(profileRelevance({...p,serial},reviewed('2016-07-21'))?.category).toBe('match');
    for(const serial of ['2843020','2843776','2843777','2843778','2843792'])expect(profileRelevance({...p,serial},reviewed('2016-07-21'))?.category).toBe('outside');
    for(const serial of ['2843112','2843565','2843566','2843588'])expect(profileRelevance({...p,serial},reviewed('2004-14-12'))?.category).toBe('match');
    for(const serial of ['2843111','2843589'])expect(profileRelevance({...p,serial},reviewed('2004-14-12'))?.category).toBe('outside');
    for(const number of ['2017-14-04','2024-10-04'])expect(profileRelevance({...p,serial:'2843566'},reviewed(number))?.category).toBe('unknown');
  });
  it('uses user-reported reviewed equipment identity without claiming full AD compliance',()=>{
    const item=batch5.find(e=>e.number==='2005-01-19')!;
    const equipmentEdge={...edge,source_document_number:item.number,applicability_conditions:Object.fromEntries(Object.entries(item.conditions).filter(([,value])=>typeof value==='string'))};
    expect(profileRelevance(profile,equipmentEdge)?.label).toBe('Equipment installation unknown');
    const installed={...profile,equipment:[{key:item.conditions.equipment_key,status:'installed' as const,note:'Equipment list'}]};
    expect(profileRelevance(installed,equipmentEdge)).toMatchObject({category:'reported',label:'Affected equipment installed — user reported'});
    expect(profileRelevance({...installed,equipment:[{...installed.equipment[0],status:'not_installed' as const}]},equipmentEdge)?.category).toBe('outside');
    expect(profileRelevance({...installed,equipment:[{...installed.equipment[0],key:'SHADIN:ADC2000-962830A-S8'}]},equipmentEdge)?.category).toBe('unknown');
  });
  it('includes both endpoints of each reviewed serial range and excludes adjacent serials',()=>{
    for(const serial of ['28-20001','28-26946','28-7125001','28-7725290'])expect(profileRelevance({...profile,serial},edge)?.category).toBe('match');
    for(const serial of ['28-20000','28-26947','28-7125000','28-7725291'])expect(profileRelevance({...profile,serial},edge)?.category).toBe('outside');
  });
  it('keeps missing, incomplete, different-prefix and padded serials unknown',()=>{
    for(const serial of ['','20001','28 - 20001','29-20001','28-020001'])expect(profileRelevance({...profile,serial},edge)?.category).toBe('unknown');
  });
  it('does not evaluate a different model, absent profile or unsupported scope',()=>{
    expect(profileRelevance(null,edge)).toBeNull();expect(profileRelevance({...profile,model:'PA-28-181'},edge)).toBeNull();
    expect(profileRelevance(profile,{...edge,applicability_conditions:{serial_ranges:'all serials except some'}})?.category).toBe('unknown');
    expect(profileRelevance(profile,{...edge,relationship_type:'covered_by'})).toBeNull();
  });
  it('distinguishes user reported installation from approval and treats omissions as unknown',()=>{
    const stc={...edge,relationship_type:'approved_for',source_document_type:'STC',source_document_number:'SA2230CE'};
    expect(profileRelevance(profile,stc)?.label).toBe('Installation unknown');
    const installed={...profile,modifications:[{number:'SA2230CE',status:'installed' as const,note:'Logbook reference'}]};
    expect(profileRelevance(installed,stc)?.label).toContain('user reported');
    expect(profileRelevance({...installed,modifications:[{...installed.modifications[0],status:'not_installed'}]},stc)?.label).toContain('Not installed');
  });
  it('allows explicit unknowns but rejects duplicate or invalid modification entries',()=>{
    expect(validateProfile({...profile,serial:''})).toBeNull();
    expect(validateProfile({...profile,modifications:[{number:'',status:'unknown',note:''}]})).not.toBeNull();
    expect(validateProfile({...profile,modifications:[{number:'SA1',status:'installed',note:''},{number:'SA1',status:'unknown',note:''}]})).toContain('one installation');
  });
  it('preserves hyphenated and plain serial identities, singleton gaps and separate AD endpoints',()=>{
    const fuel={...edge,model:'PA-28-181',applicability_conditions:{serial_ranges:'28-7690001 through 28-8690056; 28-8690061 through 28-8690061; 28-8690062 through 28-8690062; 2890001 through 2890205; 2890206 through 2890231; 2843001 through 2843879.'}};
    const p={...profile,model:'PA-28-181'};
    for(const serial of ['28-7690001','28-8690056','28-8690061','28-8690062','2890001','2890231','2843879'])expect(profileRelevance({...p,serial},fuel)?.category).toBe('match');
    for(const serial of ['28-8690057','28-8690060','28-8690063','2890000','2890232','2843880','8690061'])expect(profileRelevance({...p,serial},fuel)?.category).toBe('outside');
    for(const serial of ['02843001','28R-7690001'])expect(profileRelevance({...p,serial},fuel)?.category).toBe('unknown');
    const shaft={...fuel,applicability_conditions:{serial_ranges:fuel.applicability_conditions.serial_ranges.replace('2843879','2843672')}};
    expect(profileRelevance({...p,serial:'2843673'},fuel)?.category).toBe('match');expect(profileRelevance({...p,serial:'2843673'},shaft)?.category).toBe('outside');
  });
  it('does not turn conditional STC installation into AD applicability or accept malformed ranges',()=>{
    const conditional={...edge,applicability_conditions:{installation_window:'Requires dated installation and a service change'}};
    expect(profileRelevance({...profile,modifications:[{number:'SA2660CE',status:'installed',note:''}]},conditional)?.category).toBe('unknown');
    for(const raw of ['123 through 0124','28-1 through 29-2','99999999999999999999 through 99999999999999999999','2843001 and on'])expect(profileRelevance(profile,{...edge,applicability_conditions:{serial_ranges:raw}})?.category).toBe('unknown');
  });
});
