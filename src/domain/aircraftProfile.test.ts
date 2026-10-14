import {describe,it,expect} from 'vitest';
import {profileRelevance,validateProfile,type AircraftProfile} from './aircraftProfile';
import type {EvidenceRelationship} from './explorer';
const profile:AircraftProfile={id:'profile-test',model:'PA-28-140',name:'Test aircraft',serial:'28-20001',modifications:[],updatedAt:'2026-10-14T00:00:00Z'};
const edge:EvidenceRelationship={id:'edge',tcds_number:'2A13',model:'PA-28-140',target:'AD 2020-24-05',target_type:'certificate',relationship_type:'applies_to',evidence_page:5,evidence_excerpt:'Reviewed fixture',applicability_conditions:{serial_ranges:'28-20001 through 28-26946; 28-7125001 through 28-7725290.'},evidence_revision:'2020-11-13',source_url:'https://drs.faa.gov/',source_document_type:'AD',source_document_number:'2020-24-05'};
describe('reviewed profile relevance',()=>{
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
});
