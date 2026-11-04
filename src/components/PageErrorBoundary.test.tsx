import {act,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,Link,useLocation} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import PageErrorBoundary from './PageErrorBoundary';
let host:HTMLDivElement;let root:Root;
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
function Page(){
 const location=useLocation();const [count,setCount]=useState(0);
 if(location.pathname==='/broken')throw Error('Unreadable personal record');
 return <><button onClick={()=>setCount(count+1)}>Count {count}</button><Link to="?model=another">Change model</Link></>;
}
const app=(initial:string)=><MemoryRouter initialEntries={[initial]}><nav><Link to="/good">Aircraft search</Link></nav><PageErrorBoundary><Page/></PageErrorBoundary></MemoryRouter>;
describe('page failure containment',()=>{
 it('preserves in-page state on model query changes',async()=>{
  await act(async()=>root.render(app('/good')));await act(async()=>host.querySelector('button')!.click());await act(async()=>host.querySelector<HTMLAnchorElement>('a[href="/good?model=another"]')!.click());expect(host.textContent).toContain('Count 1');
 });
 it('keeps navigation usable after a page exception and recovers on another route',async()=>{
  vi.spyOn(console,'error').mockImplementation(()=>{});
  const expectedError=(event:ErrorEvent)=>{if(event.error?.message==='Unreadable personal record')event.preventDefault();};window.addEventListener('error',expectedError);
  try{await act(async()=>root.render(app('/broken')));}finally{window.removeEventListener('error',expectedError);}
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Your saved browser data has not been cleared');expect(host.querySelector('nav')).not.toBeNull();
  await act(async()=>host.querySelector<HTMLAnchorElement>('nav a')!.click());expect(host.querySelector('[role="alert"]')).toBeNull();expect(host.textContent).toContain('Count 0');
 });
});
