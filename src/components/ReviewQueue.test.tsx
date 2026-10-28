import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import ReviewQueue from './ReviewQueue';
import {loadReviewQueue,type ReviewQueuePage} from '../lib/relatedCatalog';
vi.mock('../lib/relatedCatalog',()=>({loadReviewQueue:vi.fn()}));
vi.mock('./SourcePdf',()=>({default:()=>null}));
const load=vi.mocked(loadReviewQueue);
const page=(number:string,total=41):ReviewQueuePage=>({total,reviewed_count:3,rows:[{
  version_id:number,model:'737-800',document_type:'AD',document_number:number,title:'Test source',
  source_url:'https://drs.faa.gov',retrieved_at:'2026-10-27',original_archived:false,
  attachments_pending:false,review_status:'pending',review_reason:'Needs review',priority:1,
}]});
let host:HTMLDivElement;let root:Root;
async function settle(){await act(async()=>{await vi.advanceTimersByTimeAsync(250);});}
async function click(text:string){await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent===text)!.click();});}
async function search(value:string){await act(async()=>{
  const input=host.querySelector('input')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
});}
beforeEach(()=>{
  vi.useFakeTimers();load.mockReset();
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.useRealTimers();});
describe('bounded review coverage',()=>{
  it('requests one page and resets pagination when searching',async()=>{
    load.mockResolvedValue(page('FIRST'));
    await act(async()=>root.render(<ReviewQueue model="737-800"/>));await settle();
    expect(load).toHaveBeenLastCalledWith('737-800','pending','all','',0);
    await click('Next');await settle();
    expect(load).toHaveBeenLastCalledWith('737-800','pending','all','',20);
    await search('ST');await search('ST01635LA');
    expect(load).toHaveBeenCalledTimes(2);await settle();
    expect(load).toHaveBeenLastCalledWith('737-800','pending','all','ST01635LA',0);
    expect(host.textContent).toContain('3 reviewed model connections across all filters');
  });
  it('ignores a late response after the selected model changes',async()=>{
    let resolve!:(value:ReviewQueuePage)=>void;
    load.mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValue(page('NEW-MODEL'));
    await act(async()=>root.render(<ReviewQueue model="737-800"/>));await settle();
    await act(async()=>root.render(<ReviewQueue model="737-700"/>));await settle();
    await act(async()=>resolve(page('STALE-MODEL')));
    expect(host.textContent).toContain('NEW-MODEL');expect(host.textContent).not.toContain('STALE-MODEL');
  });
  it('offers retry after an unavailable response',async()=>{
    load.mockResolvedValueOnce({rows:[],total:0,reviewed_count:0,notice:'Unavailable'}).mockResolvedValue(page('RECOVERED',1));
    await act(async()=>root.render(<ReviewQueue model="737-800"/>));await settle();
    expect(host.textContent).toContain('Unavailable');await click('Try again');await settle();
    expect(host.textContent).toContain('RECOVERED');expect(host.textContent).not.toContain('Try again');
  });
});
