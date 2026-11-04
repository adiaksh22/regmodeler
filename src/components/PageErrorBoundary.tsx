import {Component,type ReactNode} from 'react';
import {useLocation} from 'react-router-dom';
class PageErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){/* Do not log potentially private browser records. */}
 render(){return this.state.failed?<section role="alert" className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">This page could not be displayed</h1><p className="mt-3">Your saved browser data has not been cleared. Reload to try again, or return to aircraft search.</p><div className="mt-4 flex gap-4"><button className="text-blue-700 underline" onClick={()=>window.location.reload()}>Reload page</button><a className="text-blue-700 underline" href="/">Return to aircraft search</a></div></section>:this.props.children;}
}
export default function RouteErrorBoundary({children}:{children:ReactNode}){
 const location=useLocation();
 return <PageErrorBoundary key={location.pathname}>{children}</PageErrorBoundary>;
}
