import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import RelatedDocuments from './RelatedDocuments';
import {loadRelatedChecks,loadRelatedPage,loadRelatedText} from '../lib/relatedCatalog';
import type {RelatedDocument} from '../domain/explorer';
vi.mock('../lib/relatedCatalog',()=>({loadRelatedChecks:vi.fn(),loadRelatedPage:vi.fn(),loadRelatedText:vi.fn()}));
vi.mock('./SourcePdf',()=>({default:()=>null}));
vi.mock('./SourceQualityPanel',()=>({default:()=>null}));
const load=vi.mocked(loadRelatedPage);
const source=(number:string,status='deferred',flags=['identity_mismatch']):RelatedDocument=>({
 id:number,model:'737-800',document_type:'STC',document_number:number,title:'Test certificate',status:'current',is_active:true,
 source_url:'https://drs.faa.gov',retrieved_at:'2026-10-27',effective_date:null,holder:null,summary:null,candidate_reason:'Model index match',
 supersedes:null,superseded_by:null,original_archived:true,attachments_pending:false,review_status:status,quality_flags:flags,
});
let host:HTMLDivElement;let root:Root;
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});load.mockReset();
 vi.mocked(loadRelatedChecks).mockResolvedValue([]);vi.mocked(loadRelatedText).mockResolvedValue(null);
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
describe('related record evidence states',()=>{
 it('shows a deferred identity mismatch and explains saved PDF completeness separately',async()=>{
  load.mockResolvedValue({documents:[source('SA04009NY')],total:1});
  await act(async()=>root.render(<RelatedDocuments model="737-800" relationships={[]}/>));
  const record=host.querySelector('button[aria-pressed]')!;
  expect(record.textContent).toContain('Review deferred');expect(record.textContent).toContain('Record identity mismatch');
  await act(async()=>{(record as HTMLButtonElement).click();});
  const detail=host.querySelector('aside')!.textContent;
  expect(detail).toContain('Primary PDF saved.');expect(detail).toContain('Retrieval does not establish document completeness');
  expect(detail).toContain('not an approved graph connection');
 });
 it('discards an old load-more page after switching models',async()=>{
  let finish!:(value:Awaited<ReturnType<typeof loadRelatedPage>>)=>void;
  load.mockResolvedValueOnce({documents:[source('OLD-FIRST')],total:25})
   .mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}))
   .mockResolvedValueOnce({documents:[source('NEW-FIRST','pending',[])],total:1});
  await act(async()=>root.render(<RelatedDocuments model="737-800" relationships={[]}/>));
  await act(async()=>{[...host.querySelectorAll('button')].find(b=>b.textContent==='Load 24 more')!.click();});
  await act(async()=>root.render(<RelatedDocuments model="737-700" relationships={[]}/>));
  await act(async()=>finish({documents:[source('STALE-PAGE')],total:25}));
  expect(host.textContent).toContain('NEW-FIRST');expect(host.textContent).not.toContain('STALE-PAGE');expect(host.textContent).not.toContain('OLD-FIRST');
 });
});
