import {describe,it,expect} from 'vitest';
import {buildNodeGraph,focusedNodeGraph,relationshipLabel} from './nodeGraph';
import type {EvidenceRelationship} from './explorer';
const row=(changes:Partial<EvidenceRelationship>={}):EvidenceRelationship=>({id:'edge',tcds_number:'2A13',model:'PA-28-140',target:'STC shared',target_type:'certificate',relationship_type:'approved_for',evidence_page:1,evidence_excerpt:'Reviewed',applicability_conditions:{},evidence_revision:'1',source_url:'https://drs.faa.gov',direction:'incoming',source_entity_id:'stc',target_entity_id:'model140',model_entity_id:'model140',...changes});
describe('node graph identity and direction',()=>{
 it('shares one certificate across two model connections and keeps incoming arrows',()=>{
  const graph=buildNodeGraph([row(),row({id:'edge2',model:'PA-28-181',model_entity_id:'model181',target_entity_id:'model181'})]);
  expect(graph.nodes).toHaveLength(3);expect(graph.edges.map(e=>[e.source,e.target])).toEqual([['stc','model140'],['stc','model181']]);
 });
 it('keeps a reference through its source, without inventing a direct model connection',()=>{
  const graph=buildNodeGraph([row(),row({id:'ref',target:'Service bulletin',target_type:'service_document',target_entity_id:'sb',direction:'outgoing',path_via:'STC shared',relationship_type:'references'}),row({id:'ref',target:'Service bulletin',target_type:'service_document',target_entity_id:'sb',direction:'outgoing',path_via:'STC shared',relationship_type:'references',model:'PA-28-181',model_entity_id:'model181'})]);
  expect(graph.edges).toHaveLength(2);expect(graph.edges[1].source).toBe('stc');expect(graph.edges[1].target).toBe('sb');
 });
 it('does not merge identical provision labels from distinct amendment identities',()=>{
  const graph=buildNodeGraph([row({id:'a',direction:'outgoing',target:'23.207',target_type:'regulatory_provision',target_entity_id:'edition1969'}),row({id:'b',direction:'outgoing',target:'23.207',target_type:'regulatory_provision',target_entity_id:'edition1977'})]);
  expect(graph.nodes.filter(n=>n.label==='23.207')).toHaveLength(2);
 });
 it('labels installed-component dependencies for owners',()=>expect(relationshipLabel('affects_component')).toBe('Affects installed component'));
 it('labels family and engine relationships for the node-link diagram',()=>{expect(relationshipLabel('member_of')).toBe('Family member');expect(relationshipLabel('powered_by')).toBe('Approved engine family');});
 it('keeps sibling models and shared certification paths when focusing a family',()=>{
  const rows=['700','800'].flatMap(model=>['member_of','covered_by','powered_by'].map((type,index)=>row({id:`${model}-${type}`,model:`737-${model}`,direction:'outgoing',model_entity_id:model,source_entity_id:model,target_entity_id:['family','tcds','engine'][index],target:['737 family','A16WE','CFM56'][index],target_type:['aircraft_family','certificate','engine_model'][index],relationship_type:type})));
  rows.push(row({id:'ad',model:'737-700',model_entity_id:'700',target_entity_id:'700'}));
  const graph=buildNodeGraph(rows);const focused=focusedNodeGraph(graph,'family');
  expect(focused.nodes.map(node=>node.id).sort()).toEqual(['700','800','engine','family','tcds']);
  expect(focused.edges).toHaveLength(6);expect(focused.edges.some(edge=>edge.id==='ad')).toBe(false);
  expect(focused.edges.filter(edge=>edge.relationship.relationship_type==='covered_by').map(edge=>[edge.source,edge.target])).toEqual([['700','tcds'],['800','tcds']]);
  expect(focused.edges.some(edge=>edge.source==='700'&&edge.target==='800')).toBe(false);
 });
});
