import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useRelationshipEvidence} from './useRelationshipEvidence';
import {loadRelationshipEvidence} from './catalog';
import type {ApplicabilityRule,RegulationSource} from '../domain/explorer';
vi.mock('./catalog',()=>({loadRelationshipEvidence:vi.fn()}));
type Payload={rules:ApplicabilityRule[];materials:RegulationSource[]};
let host:HTMLDivElement;let root:Root;
function Harness({context,id}:{context:string;id:string|null}){
 const data=useRelationshipEvidence(context,id);
 return <><span>{data.status}</span><pre>{JSON.stringify({rules:data.rules,materials:data.materials})}</pre><button onClick={data.retry}>Retry</button></>;
}
const deferred=()=>{let resolve!:(data:Payload)=>void;const promise=new Promise<Payload>(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.append(host);root=createRoot(host);vi.mocked(loadRelationshipEvidence).mockReset();});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
describe('citation-bound evidence loading',()=>{
 it('discards loaded details immediately when the model changes and no source is explicitly selected',async()=>{
  vi.mocked(loadRelationshipEvidence).mockResolvedValue({rules:[],materials:[{title:'Only for model A'} as RegulationSource]});
  await act(async()=>root.render(<Harness context="model A/source A/revision A" id="A"/>));
  expect(host.textContent).toContain('Only for model A');
  await act(async()=>root.render(<Harness context="model B/source B/revision A" id={null}/>));
  expect(host.textContent).toContain('idle');expect(host.textContent).not.toContain('Only for model A');
 });
 it('ignores out-of-order responses after a model or evidence-version change',async()=>{
  const a=deferred(),b=deferred();vi.mocked(loadRelationshipEvidence).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await act(async()=>root.render(<Harness context="model A/revision 1" id="A"/>));
  await act(async()=>root.render(<Harness context="model B/revision 2" id="B"/>));
  await act(async()=>b.resolve({rules:[],materials:[{title:'Correct source B'} as RegulationSource]}));
  await act(async()=>a.resolve({rules:[],materials:[{title:'Obsolete source A'} as RegulationSource]}));
  expect(host.textContent).toContain('Correct source B');expect(host.textContent).not.toContain('Obsolete source A');
 });
 it('makes failure distinct from loaded-empty and permits retry',async()=>{
  vi.mocked(loadRelationshipEvidence).mockRejectedValueOnce(new Error('private backend error')).mockResolvedValueOnce({rules:[],materials:[]});
  await act(async()=>root.render(<Harness context="model A" id="A"/>));expect(host.textContent).toContain('error');expect(host.textContent).not.toContain('private backend');
  await act(async()=>host.querySelector('button')!.click());expect(host.textContent).toContain('ready');expect(loadRelationshipEvidence).toHaveBeenCalledTimes(2);
 });
});
