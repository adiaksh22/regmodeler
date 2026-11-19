import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,Background,Controls,Handle,Position,useStore,getNodesBounds,getViewportForBounds,type Node,type NodeProps,type Edge,type ReactFlowInstance} from '@xyflow/react';
import {radialGraphLayout,graphNodeDepths} from '../domain/graphLayout';
import EvidenceGraphEdge from './EvidenceGraphEdge';
import '@xyflow/react/dist/style.css';
import type {EvidenceRelationship} from '../domain/explorer';
import {buildNodeGraph,focusedNodeGraph,relationshipLabel} from '../domain/nodeGraph';
import {profileRelevance,type AircraftProfile} from '../domain/aircraftProfile';
import {useGraphMotion,useReducedMotion} from '../lib/useGraphMotion';
import ExplorerContext,{type ExplorerContextData} from './ExplorerContext';

const palette=(kind:string)=>{
 const value=kind.toLowerCase();
 if(value==='aircraft model')return '#93c5fd';
 if(value.includes('family'))return '#c4b5fd';
 if(value.includes('engine')||value.includes('appliance'))return '#5eead4';
 if(value.includes('regulatory'))return '#fbbf24';
 if(value.includes('service'))return '#a5b4fc';
 if(value==='ad')return '#fb923c';
 return '#67e8f9';
};
function EvidenceNode({data,selected}:NodeProps){
 const color=String(data.color);
 const labelScale=useStore(state=>Math.min(1.6,Math.max(1,.82/state.transform[2])));
 const detailed=useStore(state=>state.transform[2]>=.9);
 return <div className={`reg-orbit-node ${selected?'is-focused':''}`} data-softened={!!data.distant&&!detailed&&!selected} title={String(data.label)} style={{'--node-label-scale':labelScale} as React.CSSProperties}>
  <Handle type="target" position={Position.Left} style={{left:64,top:30,opacity:0}}/>
  <svg aria-hidden="true" viewBox="0 0 60 60" className="reg-node-symbol" style={{color}}><circle cx="30" cy="30" r={selected?26:17} fill="#0b1d3b" stroke="currentColor" strokeWidth={selected?3:1.5}/><circle cx="30" cy="30" r={selected?19:12} fill="currentColor"/></svg>
  <Handle type="source" position={Position.Right} style={{right:64,top:30,opacity:0}}/>
  <span className="reg-node-kind" style={{color}}>{String(data.kind)}</span><strong className="reg-node-label">{String(data.label)}</strong>
 </div>;
}
const nodeTypes={evidence:EvidenceNode};
const edgeTypes={evidence:EvidenceGraphEdge};
const focusCanvasNode=(container:HTMLElement|null,id:string)=>{
 const node=[...(container?.querySelectorAll<HTMLElement>('.react-flow__node.selected')??[])].find(node=>node.dataset.id===id);
 node?.focus();return !!node&&document.activeElement===node;
};

export default function NodeGraph({rows,onSelect,selectedId,profile=null,onPreview,familyOverview=false,focusRequest,onFocusHandled,context}:{rows:EvidenceRelationship[];onSelect:(row:EvidenceRelationship)=>void;selectedId:string;profile?:AircraftProfile|null;onPreview?:(row:EvidenceRelationship)=>void;familyOverview?:boolean;focusRequest?:{id:string;token:number}|null;onFocusHandled?:(token:number)=>void;context?:ExplorerContextData}) {
  const [trail,setTrail]=useState<string[]>(()=>{const family=familyOverview?buildNodeGraph(rows).nodes.find(node=>node.kind==='aircraft family'):undefined;return family?['',family.id]:[''];});
  const [filter,setFilter]=useState('all');
  const [query,setQuery]=useState('');
  const [width,setWidth]=useState(1024);
  const [touchPan,setTouchPan]=useState(false);
  const [hoveredNode,setHoveredNode]=useState('');
  const [keyboardNode,setKeyboardNode]=useState('');
  const [hoveredEdge,setHoveredEdge]=useState('');
  const [wheelZoom,setWheelZoom]=useState(true);
  const [softenDistant,setSoftenDistant]=useState(true);
  const [cameraMoving,setCameraMoving]=useState(true);
  const reducedMotion=useReducedMotion();
  const [canvas,setCanvas]=useState<ReactFlowInstance|null>(null);
  const cameraToken=useRef(0);
  const moveCamera=useCallback((operation:()=>Promise<boolean>)=>{
    const token=++cameraToken.current;setCameraMoving(true);
    void operation().finally(()=>{if(cameraToken.current===token)setCameraMoving(false);});
  },[]);
  const container=useRef<HTMLDivElement>(null);
  const pendingKeyboardFocus=useRef<string|null>(null);
  const processedFocus=useRef<typeof focusRequest>(null);
  useEffect(()=>{
    if(!focusRequest){processedFocus.current=null;return;}
    if(processedFocus.current===focusRequest)return;
    processedFocus.current=focusRequest;
    const id=focusRequest.id;
    pendingKeyboardFocus.current=id;setFilter('all');setQuery('');
    setTrail(previous=>previous[previous.length-1]===id?previous:[...previous.slice(-19),id]);
    onFocusHandled?.(focusRequest.token);
  },[focusRequest,filter,trail,onFocusHandled]);
  const initializeCanvas=(instance:ReactFlowInstance)=>{
    setCanvas(instance);
  };
  const graph=useMemo(()=>buildNodeGraph(rows.filter(r=>filter==='all'||r.relationship_type===filter)),[rows,filter]);
  const lastNode=trail[trail.length-1];
  const nodeId=graph.nodes.some(node=>node.id===lastNode)?lastNode:'';
  const familyFocus=graph.nodes.find(node=>node.id===nodeId)?.kind==='aircraft family';
  const visibleGraph=useMemo(()=>focusedNodeGraph(graph,nodeId),[graph,nodeId]);
  useEffect(()=>{
    if(!canvas||!pendingKeyboardFocus.current)return;
    let frame=0;let attempts=0;
    const restore=()=>{
      const id=pendingKeyboardFocus.current;
      if(!id)return;
      if(id===nodeId&&focusCanvasNode(container.current,id)){pendingKeyboardFocus.current=null;return;}
      if(++attempts<8)frame=requestAnimationFrame(restore);
    };
    frame=requestAnimationFrame(restore);return()=>cancelAnimationFrame(frame);
  },[canvas,nodeId,focusRequest]);
  useEffect(()=>{
    if(!container.current||typeof ResizeObserver!=='function')return;
    let frame=0;
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(container.current)setWidth(container.current.clientWidth);});});
    observer.observe(container.current);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[]);
  const nodes=useMemo(()=>{
    const layout=radialGraphLayout(visibleGraph.nodes,visibleGraph.edges,nodeId,width);
    return visibleGraph.nodes.map((n):Node=>({id:n.id,type:'evidence',data:{label:n.label,kind:n.kind,color:palette(n.kind)},position:layout.get(n.id)!,selected:n.id===nodeId,ariaLabel:`${n.kind}: ${n.label}`,width:160,height:156,measured:{width:160,height:156},style:{width:160,height:156,background:'transparent',border:0}}));
  },[visibleGraph,nodeId,width]);
  const motion=useGraphMotion(nodes,reducedMotion);
  const depths=useMemo(()=>graphNodeDepths(visibleGraph.nodes,visibleGraph.edges,nodeId),[visibleGraph,nodeId]);
  const bounds=useMemo(()=>getNodesBounds(nodes),[nodes]);
  const height=familyFocus?Math.max(680,Math.min(1800,Math.ceil(bounds.height*Math.min(1,(width-32)/Math.max(1,bounds.width))+64))):width<500?620:720;
  useEffect(()=>{
    if(!nodes.length){setCameraMoving(false);return;}
    if(!canvas)return;
    let viewport=getViewportForBounds(getNodesBounds(nodes),width,height,.03,1.15,.08);
    if(!nodeId&&nodes.length>30){
      const anchor=nodes.find(node=>depths.get(node.id)===0)!;
      const zoom=Math.max(.65,viewport.zoom);
      viewport={x:width/2-(anchor.position.x+80)*zoom,y:height/2-(anchor.position.y+30)*zoom,zoom};
    }
    moveCamera(()=>canvas.setViewport(viewport,{duration:reducedMotion?0:240,ease:t=>1-(1-t)**3}));
  },[canvas,nodes,nodeId,depths,width,height,reducedMotion,moveCamera]);
  const highlightedNodes=useMemo(()=>new Set([hoveredNode,keyboardNode].filter(id=>visibleGraph.nodes.some(node=>node.id===id))),[visibleGraph,hoveredNode,keyboardNode]);
  const highlightedEdge=visibleGraph.edges.find(edge=>edge.id===hoveredEdge);
  const nearbyNodes=useMemo(()=>{
    const anchors=new Set(highlightedNodes.size?highlightedNodes:highlightedEdge?[highlightedEdge.source,highlightedEdge.target]:[]);
    if(!softenDistant||!anchors.size)return new Set<string>();
    const nearby=new Set(anchors);
    for(const edge of visibleGraph.edges)if(anchors.has(edge.source)||anchors.has(edge.target)){nearby.add(edge.source);nearby.add(edge.target);}
    return nearby;
  },[visibleGraph,highlightedNodes,highlightedEdge,softenDistant]);
  const distantNodes=useMemo(()=>new Set(softenDistant?visibleGraph.nodes.filter(node=>nearbyNodes.size?!nearbyNodes.has(node.id):(depths.get(node.id)??Infinity)>1).map(node=>node.id):[]),[visibleGraph,nearbyNodes,depths,softenDistant]);
  const displayNodes=useMemo<Node[]>(()=>motion.nodes.map(node=>({...node,data:{...node.data,distant:distantNodes.has(node.id)},className:distantNodes.has(node.id)?'reg-distant-node':undefined})),[motion.nodes,distantNodes]);
  const edges=useMemo(()=>{
    const edges:Edge[]=visibleGraph.edges.map(e=>{const active=e.id===selectedId;const highlighted=e.id===highlightedEdge?.id||highlightedNodes.has(e.source)||highlightedNodes.has(e.target);const distant=distantNodes.has(e.source)||distantNodes.has(e.target);return {id:e.id,source:e.source,target:e.target,type:'evidence',label:active&&!familyFocus?relationshipLabel(e.relationship.relationship_type):undefined,ariaLabel:relationshipLabel(e.relationship.relationship_type),labelStyle:{fill:'#dbeafe',fontSize:11,fontWeight:600},labelShowBg:true,labelBgStyle:{fill:'#0b1d3b',fillOpacity:.95},labelBgPadding:[7,4],labelBgBorderRadius:5,style:{stroke:distant?'#263e5a':active?'#93c5fd':highlighted?'#7dd3fc':highlightedNodes.size?'#263e5a':'#496483',strokeWidth:active?2.5:highlighted?2:1.2,strokeDasharray:e.relationship.relationship_type==='references'?'5 5':undefined},interactionWidth:24}});
    return edges;
  },[visibleGraph,selectedId,familyFocus,highlightedNodes,highlightedEdge,distantNodes]);
  const incident=familyFocus?visibleGraph.edges:graph.edges.filter(e=>!nodeId||e.source===nodeId||e.target===nodeId);
  const preview=(id:string)=>{const candidates=graph.edges.filter(edge=>edge.source===id||edge.target===id);const row=candidates.find(edge=>edge.relationship.relationship_type==='covered_by')??candidates.find(edge=>edge.relationship.source_entity_id===id)??candidates[0];if(id&&row)onPreview?.(row.relationship);};
  const browse=(id:string)=>{preview(id);setQuery('');setTrail(previous=>previous[previous.length-1]===id?previous:[...previous.slice(-19),id]);};
  const back=()=>{const previous=trail.length>1?trail.slice(0,-1):[''];preview(previous[previous.length-1]);setTrail(previous);};
  const kinds=[...new Set(graph.nodes.map(node=>node.kind))];
  const selected=graph.nodes.find(node=>node.id===nodeId);
  return <div className={`min-w-0 w-full reg-node-map reg-network-studio ${familyFocus?'reg-family-network':''}`}>
    <div className="reg-studio-heading"><div><p>REGULATORY CONNECTIONS</p><h3>Explore the evidence network</h3></div><span>Reviewed sources only</span></div>
    {context&&<ExplorerContext context={context} focus={selected?.label??'All nodes'}/>}
    <div className="reg-studio-meta"><p className="reg-graph-instructions">Choose a node to explore its connections. Choose a link or connection card to read its cited source.</p><details className="reg-graph-help"><summary>Keyboard and map controls</summary><p>Use Tab to focus nodes and Enter or Space to explore. Back one node retraces your path; Show all nodes restores the overview. Use the selectors and connection cards as an alternative to the canvas.</p></details><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{visibleGraph.nodes.length} of {graph.nodes.length} nodes · {visibleGraph.edges.length} of {graph.edges.length} links</span></div>
    <div className="reg-studio-tools">
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Connection type <select className="border rounded p-2 block max-w-full" value={filter} onChange={e=>{setFilter(e.target.value);setTrail(['']);}}><option value="all">All reviewed types</option>{[...new Set(rows.map(r=>r.relationship_type))].map(t=><option key={t} value={t}>{relationshipLabel(t)}</option>)}</select></label>
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Browse node <select className="border rounded p-2 block max-w-full" value={nodeId} onChange={e=>browse(e.target.value)}><option value="">All nodes</option>{graph.nodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
    <label className="text-sm min-w-0 reg-node-search">Find a node<input aria-label="Find a relationship node" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a certificate, bulletin or regulation" className="block border rounded p-2 mt-1 w-full"/></label>
    </div>
    <nav aria-label="Graph exploration history" className="flex flex-wrap items-center gap-2 mb-3 text-xs">
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40" disabled={trail.length<2} onClick={back}>Back one node</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" onClick={()=>{setQuery('');browse('');}}>Show all nodes</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" onClick={()=>{motion.stop();if(canvas)moveCamera(()=>canvas.fitView({padding:.08,minZoom:.03,maxZoom:1.15,duration:reducedMotion?0:240}));}}>Fit map</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" onClick={()=>{motion.stop();const anchor=motion.nodes.find(node=>node.id===nodeId)??motion.nodes[0];if(anchor&&canvas)moveCamera(()=>canvas.setCenter(anchor.position.x+80,anchor.position.y+58,{zoom:1,duration:reducedMotion?0:240}));}}>Readable zoom</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" aria-pressed={wheelZoom} onClick={()=>setWheelZoom(value=>!value)}>Wheel zoom</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" aria-pressed={softenDistant} onClick={()=>setSoftenDistant(value=>!value)}>Soften distant nodes</button>
      {width<500&&<button className="rounded border border-slate-300 px-3 py-2 font-semibold" aria-pressed={touchPan} onClick={()=>setTouchPan(value=>!value)}>{touchPan?'Scroll page':'Move map'}</button>}
      <ol className="flex flex-wrap gap-x-2 gap-y-1 min-w-0" aria-label="Exploration trail">{trail.map((id,index)=>{const label=id?graph.nodes.find(n=>n.id===id)?.label:'All nodes';return label?<li key={index} className="min-w-0 break-words"><span aria-hidden="true">{index>0?'› ':''}</span><button className="text-blue-700 underline text-left" aria-current={index===trail.length-1?'location':undefined} onClick={()=>{preview(id);setTrail(trail.slice(0,index+1));}}>{label}</button></li>:null;})}</ol>
    </nav>
    {query.trim()&&<div role="group" className="mb-3" aria-label="Node search results"><p className="text-xs text-slate-600 mb-2">Matches within the current model and connection-type filters.</p><ul className="max-h-48 overflow-auto space-y-1">{graph.nodes.filter(n=>n.label.toLowerCase().includes(query.trim().toLowerCase())).map(n=><li key={n.id}><button className="border rounded p-2 w-full text-sm text-left hover:bg-blue-50" onClick={()=>browse(n.id)}>{n.label}</button></li>)}</ul>{!graph.nodes.some(n=>n.label.toLowerCase().includes(query.trim().toLowerCase()))&&<p role="status" className="text-sm">No matching nodes. Try another search or connection type.</p>}</div>}
    {selected&&<section aria-label="Focused graph node" className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Exploring · {selected.kind}</p><h3 className="mt-1 font-bold break-words">{selected.label}</h3><p className="mt-1 text-sm text-slate-600">{familyFocus?`${incident.length} reviewed family and certification paths`:`${incident.length} direct reviewed ${incident.length===1?'connection':'connections'}`}. Follow a neighboring node or select a link to read its source.</p></section>}
    <p className="reg-map-help">{width<500?(touchPan?'Drag the background to move the map. Choose Scroll page to continue down the page.':'Swipe the background to scroll this page. Choose Move map to pan, or select a model below.'):(wheelZoom?'Scroll over the map to zoom. Turn off Wheel zoom to scroll the page over the map.':'Scroll to move down the page. Turn on Wheel zoom to zoom over the map.')} Fit map shows the whole network. Hover or focus a node to highlight its connections.{softenDistant?' Farther connections soften until you hover, focus or zoom in; names stay readable.':''}</p>
    <div role="group" ref={container} className="reg-network-canvas overflow-hidden" style={{height}} data-pan-enabled={width>=500||touchPan} data-motion={motion.moving||cameraMoving?'moving':'settled'} aria-label="Interactive relationship node-link diagram" aria-describedby="node-map-status"
     onFocusCapture={event=>setKeyboardNode((event.target as HTMLElement).closest<HTMLElement>('.react-flow__node')?.dataset.id??'')}
     onBlurCapture={event=>setKeyboardNode((event.relatedTarget as HTMLElement|null)?.closest?.<HTMLElement>('.react-flow__node')?.dataset.id??'')}
     onKeyDownCapture={event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      const node=(event.target as HTMLElement).closest<HTMLElement>('.react-flow__node');
      if(!node?.dataset.id)return;
      event.preventDefault();event.stopPropagation();const id=node.dataset.id;
      pendingKeyboardFocus.current=id===nodeId?null:id;browse(id);
    }}>
      <ReactFlow onInit={initializeCanvas} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodes={displayNodes} edges={edges} minZoom={0.03} maxZoom={2} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null}
       autoPanOnNodeFocus={!nodeId&&nodes.length>30} panOnDrag={width>=500||touchPan} zoomOnScroll={wheelZoom} preventScrolling={wheelZoom} onNodeDragStart={motion.stop} onMoveStart={event=>{if(event){++cameraToken.current;setCameraMoving(true);motion.stop();}}} onMoveEnd={event=>{if(event)setCameraMoving(false);}} onNodesChange={motion.onNodesChange}
       onNodeMouseEnter={(_,node)=>setHoveredNode(node.id)} onNodeMouseLeave={()=>setHoveredNode('')}
       onEdgeMouseEnter={(_,edge)=>setHoveredEdge(edge.id)} onEdgeMouseLeave={()=>setHoveredEdge('')}
       onNodeClick={(_,n)=>browse(n.id)} onEdgeClick={(_,e)=>{const row=graph.edges.find(r=>r.id===e.id)?.relationship;if(row)onSelect(row);}}><Background color="#315681" gap={36} size={1}/><Controls aria-label="" showInteractive={false}/></ReactFlow>
    </div>
    <p id="node-map-status" className="text-xs text-slate-500 my-3" aria-live="polite">{selected?`${selected.label}: ${incident.length} ${familyFocus?'family and certification paths':`direct reviewed connection${incident.length===1?'':'s'}`} shown below.`:'Arrows preserve reviewed direction. Dashed links are references; shared nodes use one canonical catalog identity.'}</p>
    <div role="group" className="mb-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Node type legend">{kinds.map(kind=>{const color=palette(kind);return <span key={kind} className="flex items-center gap-1.5 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{background:color,border:`2px solid ${color}`}}/>{kind}</span>})}</div>
    <h3 className="font-semibold text-sm mt-4 mb-2">{selected?'Connections to explore':'Reviewed connections'}</h3>
    <ul aria-label="Node connections" className="space-y-2 max-h-80 overflow-auto">{incident.map(e=>{const source=graph.nodes.find(n=>n.id===e.source);const target=graph.nodes.find(n=>n.id===e.target);const neighbor=nodeId?(e.source===nodeId?target:source):null;return <li key={e.id} className={`rounded-lg border p-3 ${selectedId===e.id?'bg-blue-50 border-blue-500':'border-slate-200'}`}>
      <button aria-pressed={selectedId===e.id} className="w-full text-left text-sm rounded focus-visible:outline-2 focus-visible:outline-blue-600" onClick={()=>onSelect(e.relationship)}>{source?.label} → {target?.label}<span className="block text-xs text-slate-600 mt-1">{relationshipLabel(e.relationship.relationship_type)} · Read source evidence</span>{profileRelevance(profile,e.relationship)&&<span className="block text-xs text-blue-800 mt-1">{profileRelevance(profile,e.relationship)!.label}</span>}</button>
      <div className="flex flex-wrap gap-2 mt-2">{(neighbor?[neighbor]:[source,target]).filter((node):node is NonNullable<typeof node>=>!!node).map(node=><button key={node.id} className="text-xs text-blue-800 border border-blue-200 rounded-md bg-white px-2 py-1 text-left break-words" onClick={()=>browse(node.id)}>Explore {node.label}</button>)}</div>
    </li>;})}</ul>
    {!incident.length&&<p className="text-sm">No reviewed connections match this filter.</p>}
  </div>;
}
