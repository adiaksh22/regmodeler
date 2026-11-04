import type {EvidenceRelationship} from './explorer';
export const relationshipLabel=(value:string)=>({covered_by:'Covered by',certified_against:'Certification basis',applies_to:'Conditional applicability',approved_for:'Approved modification scope',affects_component:'Affects installed component',references:'References',supersedes:'Supersedes',member_of:'Family member',powered_by:'Approved engine family',project_for:'Certification project'}[value]??value.replaceAll('_',' '));
export function buildNodeGraph(rows:EvidenceRelationship[]) {
  const nodes=new Map<string,{id:string;label:string;kind:string}>();
  const edges=new Map<string,{id:string;source:string;target:string;relationship:EvidenceRelationship}>();
  for(const row of rows){
    const model=row.model_entity_id??`model:${row.model}`;
    const target=row.direction==='incoming'?row.source_entity_id??`certificate:${row.basis_key??row.target}`:row.target_entity_id??`${row.target_type}:${row.basis_key??row.target}`;
    const source=row.path_via?row.source_entity_id??`certificate:${row.path_via}`:row.direction==='incoming'?target:model;
    const end=row.direction==='incoming'?model:target;
    nodes.set(model,{id:model,label:row.model,kind:'Aircraft model'});
    nodes.set(target,{id:target,label:row.target,kind:row.target_type.replaceAll('_',' ')});
    if(row.path_via)nodes.set(source,{id:source,label:row.path_via,kind:row.source_document_type??'Source'});
    edges.set(row.id,{id:row.id,source,target:end,relationship:row});
  }
  return {nodes:[...nodes.values()],edges:[...edges.values()]};
}

export function focusedNodeGraph(graph:ReturnType<typeof buildNodeGraph>,nodeId:string){
 if(!nodeId)return graph;
 const direct=graph.edges.filter(edge=>edge.source===nodeId||edge.target===nodeId);
 const family=graph.nodes.find(node=>node.id===nodeId)?.kind==='aircraft family';
 const members=new Set(direct.filter(edge=>edge.relationship.relationship_type==='member_of').flatMap(edge=>[edge.source,edge.target]).filter(id=>id!==nodeId));
 const edges=family?graph.edges.filter(edge=>direct.includes(edge)||(members.has(edge.source)&&['covered_by','certified_against','powered_by'].includes(edge.relationship.relationship_type))):direct;
 const ids=new Set([nodeId,...edges.flatMap(edge=>[edge.source,edge.target])]);
 return {nodes:graph.nodes.filter(node=>ids.has(node.id)),edges};
}
