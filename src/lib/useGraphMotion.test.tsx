import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Node} from '@xyflow/react';
import {useGraphMotion,useReducedMotion} from './useGraphMotion';

let host:HTMLDivElement;let root:Root;
let frames:Map<number,FrameRequestCallback>;let sequence:number;
let output:ReturnType<typeof useGraphMotion>;
const nodes=(x=0):Node[]=>[{id:'a',position:{x,y:0},data:{}},{id:'b',position:{x:500,y:0},data:{}}];
function Probe({items,reduced=false}:{items:Node[];reduced?:boolean}){output=useGraphMotion(items,reduced);return null;}
const render=async(items:Node[],reduced=false)=>{await act(async()=>root.render(<Probe items={items} reduced={reduced}/>));};
async function tick(time:number){await act(async()=>{const pending=[...frames.values()];frames.clear();for(const callback of pending)callback(time);});}
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});frames=new Map();sequence=0;
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++sequence,callback);return sequence;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('bounded graph motion',()=>{
 it('interpolates shared positions and settles after 240ms',async()=>{
  await render(nodes());await render(nodes(200));expect(output.moving).toBe(true);
  await tick(0);await tick(120);
  expect(output.nodes[0].position.x).toBeGreaterThan(0);expect(output.nodes[0].position.x).toBeLessThan(200);
  await tick(240);expect(output.nodes[0].position.x).toBe(200);expect(output.moving).toBe(false);expect(frames.size).toBe(0);
 });
 it('interrupts animation on dragging and keeps nodes apart',async()=>{
  await render(nodes());await render(nodes(200));await tick(0);await tick(100);
  await act(async()=>output.onNodesChange([{type:'position',id:'a',position:{x:500,y:0},dragging:true}]));
  expect(frames.size).toBe(0);expect(output.moving).toBe(false);
  const a=output.nodes[0].position,b=output.nodes[1].position;
  expect(Math.abs(a.x-b.x)>=180||Math.abs(a.y-b.y)>=176).toBe(true);
 });
 it('snaps to final layout when reduced motion is enabled during a transition',async()=>{
  await render(nodes());const target=nodes(200);await render(target);await tick(0);await tick(100);
  await render(target,true);expect(output.moving).toBe(false);expect(output.nodes[0].position.x).toBe(200);expect(frames.size).toBe(0);
 });
 it('reacts to system reduced-motion changes and removes the listener',async()=>{
  const media=new EventTarget();let matches=false;
  Object.defineProperty(media,'matches',{get:()=>matches});const remove=vi.spyOn(media,'removeEventListener');
  vi.stubGlobal('matchMedia',()=>media);let reduced:boolean|undefined;
  function Preference(){reduced=useReducedMotion();return null;}
  await act(async()=>root.render(<Preference/>));expect(reduced).toBe(false);
  await act(async()=>{matches=true;media.dispatchEvent(new Event('change'));});expect(reduced).toBe(true);
  await act(async()=>root.render(null));expect(remove).toHaveBeenCalledWith('change',expect.any(Function));
 });
});
