import {describe,expect,it} from 'vitest';
import {radialGraphLayout,avoidNodeOverlap} from './graphLayout';
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
 it('uses two mobile columns and keeps every model and shared source in the layout',()=>{
  const nodes=[{id:'family',kind:'aircraft family'},...Array.from({length:17},(_,i)=>({id:`model-${i}`,kind:'Aircraft model'})),...['tc','engine1','engine2'].map(id=>({id,kind:'certificate'}))];
  const positions=radialGraphLayout(nodes,[],'family',320);
  expect(positions.size).toBe(21);
  expect(new Set(nodes.filter(node=>node.kind==='Aircraft model').map(node=>positions.get(node.id)!.x)).size).toBe(3); // final centered single member
  for(const a of nodes)for(const b of nodes)if(a.id!==b.id){const p=positions.get(a.id)!,q=positions.get(b.id)!;expect(Math.abs(p.x-q.x)>=180||Math.abs(p.y-q.y)>=176).toBe(true);}
 });
 it('keeps dragged labels and symbols clear without moving neighboring nodes',()=>{
  const nodes=[{id:'a',position:{x:0,y:0}},{id:'b',position:{x:210,y:0}},{id:'c',position:{x:210,y:150}}];
  const before=JSON.stringify(nodes);const positions={a:{x:0,y:0}};
  const safe=avoidNodeOverlap('a',{x:210,y:0},nodes,positions);
  for(const other of nodes.slice(1))expect(Math.abs(safe.x-other.position.x)>=180||Math.abs(safe.y-other.position.y)>=176).toBe(true);
  expect(avoidNodeOverlap('a',{x:-200,y:0},nodes,positions)).toEqual({x:-200,y:0});
  expect(JSON.stringify(nodes)).toBe(before);expect(positions).toEqual({a:{x:0,y:0}});
 });
});
