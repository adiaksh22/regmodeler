import type {EvidenceRelationship} from './explorer';
export const relationshipLabel=(value:string)=>({covered_by:'Covered by',certified_against:'Certification basis',applies_to:'Conditional applicability',approved_for:'Approved modification scope',affects_component:'Affects installed component',references:'References',supersedes:'Supersedes'}[value]??value.replaceAll('_',' '));
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
