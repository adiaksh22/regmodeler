import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import NodeGraph from './NodeGraph';
import type {EvidenceRelationship} from '../domain/explorer';
vi.mock('@xyflow/react',()=>({ReactFlow:({children}:{children:React.ReactNode})=><div>{children}</div>,Background:()=>null,Controls:()=>null,MarkerType:{ArrowClosed:'arrowclosed'}}));
const edge=(changes:Partial<EvidenceRelationship>):EvidenceRelationship=>({id:'certificate',tcds_number:'A16WE',model:'Aircraft',target:'Certificate',target_type:'certificate',relationship_type:'covered_by',evidence_page:1,evidence_excerpt:'Reviewed',applicability_conditions:{},evidence_revision:'82',source_url:'https://drs.faa.gov',direction:'outgoing',source_entity_id:'aircraft',target_entity_id:'certificate',model_entity_id:'aircraft',...changes});
const rows=[edge({}),edge({id:'engine',target:'Engine',target_type:'engine_model',target_entity_id:'engine',relationship_type:'powered_by'}),edge({id:'reference',source_entity_id:'certificate',target_entity_id:'bulletin',target:'Bulletin',target_type:'service_document',path_via:'Certificate',relationship_type:'references'})];
let host:HTMLDivElement;let root:Root;
const onSelect=vi.fn();
async function click(label:string){await act(async()=>{[...host.querySelectorAll('button')].find(node=>node.textContent===label)!.click();});}
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});onSelect.mockReset();host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<NodeGraph rows={rows} onSelect={onSelect} selectedId="certificate"/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
describe('graph exploration controls',()=>{
 it('traverses neighbors, goes back and restores all nodes without changing evidence',async()=>{
  await click('Explore Certificate');expect(host.querySelector('[aria-label="Focused graph node"]')?.textContent).toContain('2 direct reviewed connections');
  await click('Explore Bulletin');expect(host.querySelector('[aria-label="Focused graph node"]')?.textContent).toContain('1 direct reviewed connection');
  expect(host.querySelector('[aria-label="Exploration trail"]')?.textContent).toContain('Certificate');
  await click('Back one node');expect(host.querySelector('[aria-label="Focused graph node"] h3')?.textContent).toBe('Certificate');
  await click('Show all nodes');expect(host.querySelector('[aria-label="Focused graph node"]')).toBeNull();expect(onSelect).not.toHaveBeenCalled();
 });
 it('keeps source evidence selection separate from node traversal',async()=>{
  await click('Explore Certificate');
  await act(async()=>{host.querySelector<HTMLButtonElement>('[aria-label="Node connections"] button[aria-pressed="false"]')!.click();});
  expect(onSelect).toHaveBeenCalledWith(rows[2]);expect(host.querySelector('[aria-label="Focused graph node"] h3')?.textContent).toBe('Certificate');
 });
 it('resets exploration history when the relationship filter changes',async()=>{
  await click('Explore Certificate');await click('Explore Bulletin');
  await act(async()=>{const select=host.querySelector('select')!;select.value='references';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(host.querySelector('[aria-label="Focused graph node"]')).toBeNull();
  expect([...host.querySelectorAll('button')].find(node=>node.textContent==='Back one node')?.disabled).toBe(true);
  expect(host.querySelectorAll('[aria-label="Node connections"] li')).toHaveLength(1);
 });
});
