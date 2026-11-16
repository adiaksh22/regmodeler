// Position canonical nodes only; layout never adds or reverses evidence relationships.
export function radialGraphLayout(nodes:{id:string;kind:string;label?:string}[],edges:{source:string;target:string}[],focus='',width=1200) {
 const root=nodes.find(node=>node.id===focus)??nodes.find(node=>node.kind==='Aircraft model')??nodes[0];
 const positions=new Map<string,{x:number;y:number}>();
 if(!root)return positions;
 if(root.kind==='aircraft family'){
  const order=(node:typeof root)=>{const number=Number(/^737-(\d+)/.exec(node.label??'')?.[1]);return !number?Infinity:number===8200?10008.2:number<100?10000+number:number;};
  const models=nodes.filter(node=>node.kind==='Aircraft model').sort((a,b)=>order(a)!==order(b)?order(a)-order(b):(a.label??a.id).localeCompare(b.label??b.id,undefined,{numeric:true}));
  const columns=Math.max(1,Math.min(models.length,width<500?2:width<850?4:6));const rowCount=Math.ceil(models.length/columns);
  positions.set(root.id,{x:-80,y:-210});
  models.forEach((node,index)=>{
   const row=Math.floor(index/columns);const count=Math.min(columns,models.length-row*columns);
   positions.set(node.id,{x:(index%columns-(count-1)/2)*210-80,y:row*180-30});
  });
  const sources=nodes.filter(node=>node.id!==root.id&&node.kind!=='Aircraft model');
  const sourceColumns=Math.min(columns,Math.max(1,sources.length));
  sources.forEach((node,index)=>{const row=Math.floor(index/sourceColumns);const count=Math.min(sourceColumns,sources.length-row*sourceColumns);positions.set(node.id,{x:(index%sourceColumns-(count-1)/2)*210-80,y:rowCount*180+70+row*180});});
  return positions;
 }
 const neighbors=new Map(nodes.map(node=>[node.id,new Set<string>()]));
 for(const edge of edges){neighbors.get(edge.source)?.add(edge.target);neighbors.get(edge.target)?.add(edge.source);}
 const distance=new Map([[root.id,0]]);const queue=[root.id];
 for(let index=0;index<queue.length;index++)for(const id of neighbors.get(queue[index])??[])if(!distance.has(id)){distance.set(id,distance.get(queue[index])!+1);queue.push(id);}
 const disconnected=Math.max(...distance.values())+1;
 const rings=new Map<number,string[]>();
 for(const node of nodes){const ring=distance.get(node.id)??disconnected;rings.set(ring,[...(rings.get(ring)??[]),node.id]);}
 let radius=0;
 for(const [depth,ids] of [...rings].sort(([a],[b])=>a-b)){
  radius=depth===0?0:Math.max(radius+300,ids.length*260/(2*Math.PI));
  ids.forEach((id,index)=>{const angle=-Math.PI/2+index*2*Math.PI/ids.length;positions.set(id,{x:Math.cos(angle)*radius-80,y:Math.sin(angle)*radius-30});});
 }
 return positions;
}

type Point={x:number;y:number};
// Resolve only the user's dragged node. Keep other nodes still while reading.
export function avoidNodeOverlap(id:string,requested:Point,nodes:{id:string;position:Point}[],previous:Record<string,Point>):Point {
 const occupied=nodes.filter(node=>node.id!==id).map(node=>previous[node.id]??node.position);
 const clear=(point:Point)=>occupied.every(other=>Math.abs(point.x-other.x)>=180||Math.abs(point.y-other.y)>=176);
 if(clear(requested))return requested;
 const collisions=occupied.filter(other=>Math.abs(requested.x-other.x)<180&&Math.abs(requested.y-other.y)<176);
 const candidates=collisions.flatMap(other=>[{x:other.x-180,y:requested.y},{x:other.x+180,y:requested.y},{x:requested.x,y:other.y-176},{x:requested.x,y:other.y+176}]);
 const nearest=candidates.filter(clear).sort((a,b)=>Math.hypot(a.x-requested.x,a.y-requested.y)-Math.hypot(b.x-requested.x,b.y-requested.y))[0];
 return nearest??previous[id]??nodes.find(node=>node.id===id)!.position;
}
