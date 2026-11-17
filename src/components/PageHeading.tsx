import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';

/** Announce completed route content through its heading, without stealing focus on filters. */
export default function PageHeading({title,children,className}:{title:string;children:ReactNode;className?:string}){
 const {pathname}=useLocation();
 const heading=useRef<HTMLHeadingElement>(null);
 const previousPath=useRef<string|null>(null);
 useLayoutEffect(()=>{
  document.title=`${title} · RegModeler`;
  if(previousPath.current!==pathname){
   previousPath.current=pathname;
   heading.current?.focus({preventScroll:true});
   window.scrollTo({top:0,left:0,behavior:'instant'});
  }
 },[pathname,title]);
 return <h1 ref={heading} tabIndex={-1} className={`reg-page-heading ${className??''}`}>{children}</h1>;
}
