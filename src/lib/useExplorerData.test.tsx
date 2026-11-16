import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useExplorerData} from './useExplorerData';
import {loadScopedGraph,loadMonitoring,loadVariantSummaries} from './explorerReads';
import {tcdsSamples} from '../data/tcdsSamples';
import type {EvidenceRelationship} from '../domain/explorer';
vi.mock('./explorerReads',()=>({explorerConfigured:true,loadScopedGraph:vi.fn(),loadMonitoring:vi.fn(),loadVariantSummaries:vi.fn(),invalidateExplorerSection:vi.fn()}));
const doc={...tcdsSamples[0],authority:'FAA'};
const edge=(id:string,model:string)=>({id,model}) as EvidenceRelationship;
const pending=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};};
let host:HTMLDivElement;let root:Root;
function Harness({model='A',reload=0,enabled=true}:{model?:string;reload?:number;enabled?:boolean}){
 const state=useExplorerData(doc,model,false,enabled,reload);
 return <><pre>{JSON.stringify(state.details)}</pre><button onClick={()=>state.retry('monitoring')}>Retry monitoring</button><button onClick={()=>state.retry('relationships')}>Retry relationships</button></>;
}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.mocked(loadScopedGraph).mockReset().mockResolvedValue([edge('A','A')]);vi.mocked(loadMonitoring).mockReset().mockResolvedValue([]);vi.mocked(loadVariantSummaries).mockReset().mockResolvedValue([]);host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
const read=()=>JSON.parse(host.querySelector('pre')!.textContent!);
describe('independent aircraft section loading',()=>{
 it('shows the graph while another section is pending or failed and retries only that section',async()=>{
  const variants=pending<[]>();vi.mocked(loadVariantSummaries).mockReturnValue(variants.promise);vi.mocked(loadMonitoring).mockRejectedValueOnce(Error('private backend detail')).mockResolvedValueOnce([]);
  await act(async()=>root.render(<Harness/>));expect(read().relationships).toHaveLength(1);expect(read().sections.variants.status).toBe('loading');expect(read().sections.monitoring.status).toBe('error');expect(host.textContent).not.toContain('private backend');
  await act(async()=>host.querySelector('button')!.click());expect(read().sections.monitoring.status).toBe('ready');expect(loadScopedGraph).toHaveBeenCalledTimes(1);expect(loadVariantSummaries).toHaveBeenCalledTimes(1);
  await act(async()=>variants.resolve([]));expect(read().sections.variants.status).toBe('ready');
 });
 it('keeps successful sections when graph loading fails',async()=>{
  vi.mocked(loadScopedGraph).mockRejectedValue(Error('network'));await act(async()=>root.render(<Harness/>));expect(read().available).toBe(false);expect(read().sections.relationships.status).toBe('error');expect(read().sections.monitoring.status).toBe('ready');expect(read().sections.variants.status).toBe('ready');
 });
 it('never shows old-model rows or out-of-order responses in a new model scope',async()=>{
  const a=pending<EvidenceRelationship[]>(),b=pending<EvidenceRelationship[]>();vi.mocked(loadScopedGraph).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await act(async()=>root.render(<Harness model="A"/>));await act(async()=>root.render(<Harness model="B"/>));expect(read().relationships).toEqual([]);
  await act(async()=>b.resolve([edge('B','B')]));await act(async()=>a.resolve([edge('A','A')]));expect(read().relationships[0].model).toBe('B');
 });
 it('retains successful same-scope data with a dated error when refresh fails',async()=>{
  await act(async()=>root.render(<Harness/>));vi.mocked(loadScopedGraph).mockRejectedValueOnce(Error('offline'));
  await act(async()=>root.render(<Harness reload={1} enabled={false}/>));expect(read().relationships[0].model).toBe('A');
  await act(async()=>root.render(<Harness reload={1}/>));expect(read().relationships[0].model).toBe('A');expect(read().sections.relationships.status).toBe('error');expect(read().sections.relationships.loadedAt).toBeTruthy();
 });
});
