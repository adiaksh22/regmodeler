import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Node,NodeChange} from '@xyflow/react';
import {avoidNodeOverlap} from '../domain/graphLayout';

export function useReducedMotion(){
 const [reduced,setReduced]=useState(()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  if(typeof matchMedia!=='function')return;
  const query=matchMedia('(prefers-reduced-motion: reduce)');
  const change=()=>setReduced(query.matches);query.addEventListener('change',change);
  return()=>query.removeEventListener('change',change);
 },[]);
 return reduced;
}

export function useGraphMotion(nodes:Node[],reduced:boolean){
 type Positions=Record<string,{x:number;y:number}>;
 const current=useRef<Positions>({});const frame=useRef(0);
 const [positions,setPositions]=useState<Positions>({});
 const [moving,setMoving]=useState(false);
 const write=useCallback((next:Positions)=>{current.current=next;setPositions(next);},[]);
 useEffect(()=>{
  globalThis.cancelAnimationFrame?.(frame.current);
  const target=Object.fromEntries(nodes.map(node=>[node.id,node.position]));
  const start=current.current;
  const changes=nodes.some(node=>start[node.id]&&(start[node.id].x!==node.position.x||start[node.id].y!==node.position.y));
  if(reduced||!changes||typeof requestAnimationFrame!=='function'){write(target);setMoving(false);return;}
  setMoving(true);let began:number|undefined;
  const tick=(time:number)=>{
   began??=time;const progress=Math.min(1,(time-began)/240);const eased=1-(1-progress)**3;
   write(Object.fromEntries(nodes.map(node=>{const from=start[node.id]??node.position;return [node.id,{x:from.x+(node.position.x-from.x)*eased,y:from.y+(node.position.y-from.y)*eased}];})));
   if(progress<1)frame.current=requestAnimationFrame(tick);else setMoving(false);
  };
  frame.current=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame.current);
 },[nodes,reduced,write]);
 const stop=()=>{globalThis.cancelAnimationFrame?.(frame.current);setMoving(false);};
 const onNodesChange=(changes:NodeChange[])=>{
  let next=current.current;let moved=false;
  for(const change of changes){
   if(change.type!=='position'||!change.position||!nodes.some(node=>node.id===change.id))continue;
   const safe=avoidNodeOverlap(change.id,change.position,nodes,next);
   if(next[change.id]?.x===safe.x&&next[change.id]?.y===safe.y)continue;
   if(!moved){next={...next};moved=true;}next[change.id]=safe;
  }
  if(moved){stop();write(next);}
 };
 const positioned=useMemo(()=>nodes.map(node=>({...node,position:positions[node.id]??node.position})),[nodes,positions]);
 return {nodes:positioned,moving,onNodesChange,stop};
}
