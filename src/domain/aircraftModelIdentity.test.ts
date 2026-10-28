import {describe,it,expect} from 'vitest';
import {aircraftModelIdentity} from './aircraftModelIdentity';
describe('reviewed aircraft model aliases',()=>{
 it('resolves reviewed NG aliases without changing MAX or unrelated certificates',()=>{
  expect(aircraftModelIdentity('A16WE','737-800 Series')).toBe('737-800');
  expect(aircraftModelIdentity('A16WE','737-900ER Series')).toBe('737-900ER');
  expect(aircraftModelIdentity('A16WE','737-8')).toBe('737-8');
  expect(aircraftModelIdentity('A16WE','737-800')).toBe('737-800');
  expect(aircraftModelIdentity('OTHER','737-800 Series')).toBe('737-800 Series');
  expect(aircraftModelIdentity('A16WE','737-600 Series')).toBe('737-600 Series');
 });
});
