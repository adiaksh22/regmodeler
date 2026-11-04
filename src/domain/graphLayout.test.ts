import {describe,expect,it} from 'vitest';
import {radialGraphLayout} from './graphLayout';
describe('radial evidence layout',()=>{
 it('centers the focused entity and spaces its neighbors without altering direction',()=>{
  const nodes=[{id:'model',kind:'Aircraft model'},{id:'ad',kind:'AD'},{id:'source',kind:'Source'}];
  const edges=[{source:'ad',target:'model'},{source:'ad',target:'source'}];
  const original=JSON.stringify(edges);const positions=radialGraphLayout(nodes,edges,'ad');
  expect(positions.get('ad')).toEqual({x:-80,y:-30});
  expect(positions.get('model')!.y).toBeLessThan(-30);expect(positions.get('source')!.y).toBeGreaterThan(-30);
  expect(JSON.stringify(edges)).toBe(original);
 });
 it('places disconnected entities and uses a model as the overview anchor',()=>{
  const nodes=[{id:'source',kind:'Source'},{id:'model',kind:'Aircraft model'},{id:'other',kind:'Source'}];
  const positions=radialGraphLayout(nodes,[{source:'model',target:'source'}]);
  expect(positions.get('model')).toEqual({x:-80,y:-30});expect(positions.size).toBe(3);
  expect(new Set([...positions.values()].map(position=>JSON.stringify(position))).size).toBe(3);
 });
 it('handles an empty filtered graph',()=>{expect(radialGraphLayout([],[]).size).toBe(0);});
 it('separates all family members from shared certification sources',()=>{
  const nodes=[{id:'family',kind:'aircraft family'},...Array.from({length:17},(_,i)=>({id:`model-${i}`,kind:'Aircraft model'})),{id:'certificate',kind:'certificate'}];
  const positions=radialGraphLayout(nodes,[],'family');
  expect(positions.size).toBe(19);expect(new Set([...positions.values()].map(position=>JSON.stringify(position))).size).toBe(19);
  expect(positions.get('family')!.y).toBeLessThan(positions.get('model-0')!.y);
  expect(positions.get('certificate')!.y).toBeGreaterThan(positions.get('model-16')!.y);
 });
});
