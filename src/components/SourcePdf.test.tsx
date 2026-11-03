import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import SourcePdf from './SourcePdf';
import {getOriginalLink} from '../lib/relatedCatalog';
vi.mock('../lib/relatedCatalog',()=>({getOriginalLink:vi.fn()}));
let host:HTMLDivElement;let root:Root;
beforeEach(async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 vi.mocked(getOriginalLink).mockReset().mockResolvedValue('https://example.supabase.co/test.pdf');
 // jsdom lacks the browser's top-layer implementation; browser smoke tests verify actual inertness.
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.setAttribute('open','');}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.removeAttribute('open');}});
 host=document.createElement('div');document.body.append(host);root=createRoot(host);document.body.style.overflow='auto';
 await act(async()=>root.render(<SourcePdf versionId="version" attachmentId="attachment" page={67}/>));
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();document.body.style.overflow='';Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');Reflect.deleteProperty(HTMLDialogElement.prototype,'close');vi.restoreAllMocks();});
describe('archived PDF dialog',()=>{
 it('opens the exact cited attachment and restores focus and scroll state on close',async()=>{
  const trigger=host.querySelector('button')!;
  await act(async()=>trigger.click());
  expect(getOriginalLink).toHaveBeenCalledWith('version','attachment');
  expect(host.querySelector('dialog')?.open).toBe(true);
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Close PDF');
  expect(host.querySelector('iframe')?.src).toContain('#page=67');
  expect(document.body.style.overflow).toBe('hidden');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close PDF"]')!.click());
  expect(host.querySelector('dialog')).toBeNull();expect(document.activeElement).toBe(trigger);
  expect(document.body.style.overflow).toBe('auto');
 });
 it('handles native Escape cancellation and restores focus',async()=>{
  const trigger=host.querySelector('button')!;await act(async()=>trigger.click());
  const cancel=new Event('cancel',{cancelable:true});
  await act(async()=>{host.querySelector('dialog')!.dispatchEvent(cancel);});
  expect(cancel.defaultPrevented).toBe(true);expect(host.querySelector('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
 });
 it('offers official-source guidance when the archived original is unavailable',async()=>{
  vi.mocked(getOriginalLink).mockRejectedValue(new Error('Private failure details'));
  await act(async()=>host.querySelector('button')!.click());
  expect(host.querySelector('[role="status"]')?.textContent).toContain('Use the official source link');
  expect(host.textContent).not.toContain('Private failure');expect(host.querySelector('dialog')).toBeNull();
  expect(host.querySelector('button')!.disabled).toBe(false);
 });
 it('restores page scrolling when navigation unmounts an open viewer',async()=>{
  await act(async()=>host.querySelector('button')!.click());
  await act(async()=>root.render(<div>Another page</div>));
  expect(document.body.style.overflow).toBe('auto');
 });
});
