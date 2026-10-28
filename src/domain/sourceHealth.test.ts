import {describe,it,expect} from 'vitest';
import {sourceHealth,evidencePath,monitoredModels} from './sourceHealth';
import type {SourceMonitoring} from './sourceChanges';
const now=Date.parse('2026-10-28T12:00:00Z');
const check=(changes:Partial<SourceMonitoring>={}):SourceMonitoring=>({source:'FAA:STC:PA28',last_success:'2026-10-28T10:00:00Z',last_attempt:'2026-10-28T10:00:00Z',status:'succeeded',baseline_ready:true,...changes});
describe('source check health',()=>{
 it('shows failures even when a recent success exists',()=>{
  expect(sourceHealth(check({status:'failed'}),now).label).toBe('Latest check failed');
  expect(sourceHealth(check(),now).attention).toBe(false);
 });
 it('distinguishes overdue, missing, running and interrupted attempts',()=>{
  expect(sourceHealth(check({last_success:'2026-10-26T00:00:00Z'}),now).label).toBe('Check overdue');
  expect(sourceHealth(check({last_success:null}),now).label).toBe('Freshness unconfirmed');
  expect(sourceHealth(check({status:'running',last_attempt:'2026-10-28T11:30:00Z'}),now).label).toBe('Check in progress');
  expect(sourceHealth(check({status:'running'}),now).label).toBe('Check may be interrupted');
  expect(sourceHealth(check({baseline_ready:false}),now).label).toBe('Baseline pending');
 });
 it('routes Boeing events to A16WE and Piper events to 2A13',()=>{
  expect(evidencePath('737-800','AD','2021-09-08')).toBe('/tcds/A16WE?model=737-800');
  expect(evidencePath('PA-28-181','STC','SA_TEST')).toBe('/tcds/2A13?model=PA-28-181');
  expect(evidencePath('UNSUPPORTED','AD','TEST')).toBeNull();
  expect(evidencePath('737-8200','TCDS','A16WE')).toBe('/tcds/A16WE?model=737-8200');
  expect(monitoredModels).toHaveLength(8);
 });
});
