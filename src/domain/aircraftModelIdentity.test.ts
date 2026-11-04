import {describe,it,expect} from 'vitest';
import {aircraftModelIdentity,matchedAircraftModel} from './aircraftModelIdentity';
describe('reviewed aircraft model aliases',()=>{
 it('preserves exact model search selection across case and FAA Series aliases',()=>{
  const models=['737-100 Series','737-700 Series','737-800 Series','737-900ER Series','737-8','737-9'];
  for(const query of ['737-700','737-700 series','737-800','737-800 SERIES','737-900er'])expect(matchedAircraftModel('A16WE',models,query)).toBe(query.toUpperCase().replace(/ SERIES$/,''));
  expect(matchedAircraftModel('A16WE',models,'737-8')).toBe('737-8');
  expect(matchedAircraftModel('2A13',['PA-28-181'],'pa-28-181')).toBe('PA-28-181');
  expect(matchedAircraftModel('A16WE',models,'737')).toBeNull();
 });
 it('resolves reviewed NG aliases without changing MAX or unrelated certificates',()=>{
  expect(aircraftModelIdentity('A16WE','737-800 Series')).toBe('737-800');
  expect(aircraftModelIdentity('A16WE','737-900ER Series')).toBe('737-900ER');
  expect(aircraftModelIdentity('A16WE','737-8')).toBe('737-8');
  expect(aircraftModelIdentity('A16WE','737-800')).toBe('737-800');
  expect(aircraftModelIdentity('OTHER','737-800 Series')).toBe('737-800 Series');
  expect(aircraftModelIdentity('A16WE','737-600 Series')).toBe('737-600 Series');
 });
});
