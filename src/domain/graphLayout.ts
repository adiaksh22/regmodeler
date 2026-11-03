// Position canonical nodes only; layout never adds or reverses evidence relationships.
export function radialGraphLayout(nodes:{id:string;kind:string}[],edges:{source:string;target:string}[],focus='') {
 const root=nodes.find(node=>node.id===focus)??nodes.find(node=>node.kind==='Aircraft model')??nodes[0];
 const positions=new Map<string,{x:number;y:number}>();
 if(!root)return positions;
 const neighbors=new Map(nodes.map(node=>[node.id,new Set<string>()]));
 for(const edge of edges){neighbors.get(edge.source)?.add(edge.target);neighbors.get(edge.target)?.add(edge.source);}
 const distance=new Map([[root.id,0]]);const queue=[root.id];
 for(let index=0;index<queue.length;index++)for(const id of neighbors.get(queue[index])??[])if(!distance.has(id)){distance.set(id,distance.get(queue[index])!+1);queue.push(id);}
 const disconnected=Math.max(...distance.values())+1;
 const rings=new Map<number,string[]>();
 for(const node of nodes){const ring=distance.get(node.id)??disconnected;rings.set(ring,[...(rings.get(ring)??[]),node.id]);}
 let radius=0;
 for(const [depth,ids] of [...rings].sort(([a],[b])=>a-b)){
  radius=depth===0?0:Math.max(radius+270,ids.length*195/(2*Math.PI));
  ids.forEach((id,index)=>{const angle=-Math.PI/2+index*2*Math.PI/ids.length;positions.set(id,{x:Math.cos(angle)*radius-80,y:Math.sin(angle)*radius-30});});
 }
 return positions;
}
