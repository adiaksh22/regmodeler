import {act,Suspense,lazy} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,Link,Routes,Route,useLocation} from 'react-router-dom';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import PageHeading from './PageHeading';
let host:HTMLDivElement,root:Root;
const scroll=vi.fn();
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});vi.stubGlobal('scrollTo',scroll);scroll.mockClear();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
function Page(){const {pathname,search}=useLocation();return <><PageHeading title={pathname==='/changelog'?'FAA source changes':`TCDS ${pathname.split('/').at(-1)}`}>Page {pathname}</PageHeading><Link to="?model=PA-28-140">Change model</Link><p>{search}</p></>;}
const app=<MemoryRouter initialEntries={['/tcds/2A13']}><nav><Link to="/changelog">Changes</Link><Link to="/tcds/A16WE">Other certificate</Link></nav><Page/></MemoryRouter>;
describe('completed route context',()=>{
 it('focuses the heading and updates title on initial render and parameter/route changes',async()=>{
  await act(async()=>root.render(app));expect(document.title).toBe('TCDS 2A13 · RegModeler');expect(document.activeElement).toBe(host.querySelector('h1'));
  for(const [path,title] of [['/tcds/A16WE','TCDS A16WE'],['/changelog','FAA source changes']]){
   await act(async()=>host.querySelector<HTMLAnchorElement>(`a[href="${path}"]`)!.click());expect(document.title).toBe(`${title} · RegModeler`);expect(document.activeElement).toBe(host.querySelector('h1'));
  }
  expect(scroll).toHaveBeenCalledTimes(3);
 });
 it('keeps keyboard focus and scroll position on model/filter-only navigation and data rerenders',async()=>{
  await act(async()=>root.render(app));const field=host.querySelector<HTMLAnchorElement>('a[href$="?model=PA-28-140"]')!;field.focus();
  await act(async()=>field.click());expect(document.activeElement).toBe(field);expect(scroll).toHaveBeenCalledTimes(1);
  await act(async()=>root.render(app));expect(document.activeElement).toBe(field);expect(scroll).toHaveBeenCalledTimes(1);
 });
 it('waits for lazy page content instead of focusing a loading placeholder',async()=>{
  let resolve!:(value:{default:()=>React.ReactNode})=>void;
  const Deferred=lazy(()=>new Promise<{default:()=>React.ReactNode}>(done=>{resolve=done;}));
  await act(async()=>root.render(<MemoryRouter initialEntries={['/slow']}><Routes><Route path="/slow" element={<Suspense fallback={<p role="status">Loading</p>}><Deferred/></Suspense>}/></Routes></MemoryRouter>));
  expect(host.querySelector('h1')).toBeNull();expect(scroll).not.toHaveBeenCalled();
  await act(async()=>resolve({default:()=> <PageHeading title="Loaded page">Loaded page</PageHeading>}));
  expect(document.title).toBe('Loaded page · RegModeler');expect(document.activeElement).toBe(host.querySelector('h1'));expect(scroll).toHaveBeenCalledTimes(1);
 });
 it('updates a data-dependent title without moving focus on the same route',async()=>{
  const page=(title:string)=><MemoryRouter><PageHeading title={title}>Aircraft page</PageHeading><button>Refresh source</button></MemoryRouter>;
  await act(async()=>root.render(page('Loading aircraft')));const button=host.querySelector('button')!;button.focus();
  await act(async()=>root.render(page('TCDS 2A13')));expect(document.title).toBe('TCDS 2A13 · RegModeler');expect(document.activeElement).toBe(button);expect(scroll).toHaveBeenCalledTimes(1);
 });
});
