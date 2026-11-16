import {describe,expect,it,vi} from 'vitest';
import {readBoundedGraph} from './boundedGraph';
import type {EvidenceRelationship} from '../domain/explorer';
const row=(id:string,model='model')=>({id,model,path_via:null}) as EvidenceRelationship;
describe('graph completeness bounds',()=>{
 it('collects stable bounded pages and permits a shared edge in different model scopes',async()=>{
  const rows=[row('shared','A'),row('shared','B'),row('last')];
  const read=vi.fn(async(offset:number,size:number)=>({rows:rows.slice(offset,offset+size),total:3}));expect(await readBoundedGraph(read,10,2)).toEqual(rows);expect(read).toHaveBeenCalledTimes(2);
 });
 it('refuses oversized results before requesting further pages',async()=>{
  const read=vi.fn(async()=>({rows:[row('first')],total:1001}));await expect(readBoundedGraph(read,1000)).rejects.toMatchObject({code:'TOO_LARGE'});expect(read).toHaveBeenCalledTimes(1);
 });
 it('rejects silently capped pages, changing totals and duplicate offsets',async()=>{
  await expect(readBoundedGraph(async()=>({rows:[row('one')],total:4}),10,2)).rejects.toMatchObject({code:'INCOMPLETE'});
  await expect(readBoundedGraph(async offset=>({rows:offset?[row('c')]:[row('a'),row('b')],total:offset?3:4}),10,2)).rejects.toMatchObject({code:'INCOMPLETE'});
  await expect(readBoundedGraph(async()=>({rows:[row('a'),row('b')],total:4}),10,2)).rejects.toMatchObject({code:'INCOMPLETE'});
  await expect(readBoundedGraph(async()=>({rows:[],total:null}),10)).rejects.toMatchObject({code:'INCOMPLETE'});
 });
 it('accepts a confirmed empty scope',async()=>{expect(await readBoundedGraph(async()=>({rows:[],total:0}),10)).toEqual([]);});
});
