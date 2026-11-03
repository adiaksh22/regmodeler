import {useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,Background,Controls,Handle,Position,MarkerType,type Node,type NodeProps,type Edge,type ReactFlowInstance} from '@xyflow/react';
import {radialGraphLayout} from '../domain/graphLayout';
import '@xyflow/react/dist/style.css';
import type {EvidenceRelationship} from '../domain/explorer';
import {buildNodeGraph,relationshipLabel} from '../domain/nodeGraph';
import {profileRelevance,type AircraftProfile} from '../domain/aircraftProfile';

const palette=(kind:string)=>{
 const value=kind.toLowerCase();
 if(value==='aircraft model')return '#60a5fa';
 if(value.includes('family'))return '#c4b5fd';
 if(value.includes('engine')||value.includes('appliance'))return '#5eead4';
 if(value.includes('regulatory'))return '#fbbf24';
 if(value.includes('service'))return '#a5b4fc';
 if(value==='ad')return '#fb923c';
 return '#67e8f9';
};
function EvidenceNode({data,selected}:NodeProps){
 const color=String(data.color);
 return <div className={`reg-orbit-node ${selected?'is-focused':''}`} title={String(data.label)}>
  <Handle type="target" position={Position.Left} style={{left:64,top:30,opacity:0}}/>
  <svg aria-hidden="true" viewBox="0 0 60 60" className="reg-node-symbol" style={{color}}><polygon points="30,3 53,16.5 53,43.5 30,57 7,43.5 7,16.5" fill="none" stroke="currentColor" strokeWidth={selected?3:1.5}/><polygon points="30,12 45,21 45,39 30,48 15,39 15,21" fill="currentColor" opacity={selected?1:.85}/></svg>
  <Handle type="source" position={Position.Right} style={{right:64,top:30,opacity:0}}/>
  <span className="reg-node-kind" style={{color}}>{String(data.kind)}</span><strong className="reg-node-label">{String(data.label)}</strong>
 </div>;
}
const nodeTypes={evidence:EvidenceNode};

export default function NodeGraph({rows,onSelect,selectedId,profile=null,onPreview}:{rows:EvidenceRelationship[];onSelect:(row:EvidenceRelationship)=>void;selectedId:string;profile?:AircraftProfile|null;onPreview?:(row:EvidenceRelationship)=>void}) {
  const [trail,setTrail]=useState<string[]>(['']);
  const [filter,setFilter]=useState('all');
  const [query,setQuery]=useState('');
  const [positions,setPositions]=useState<Record<string,{x:number;y:number}>>({});
  const [canvas,setCanvas]=useState<ReactFlowInstance|null>(null);
  const container=useRef<HTMLDivElement>(null);
  const pendingKeyboardFocus=useRef<string|null>(null);
  const initializeCanvas=(instance:ReactFlowInstance)=>{
    setCanvas(instance);
    const id=pendingKeyboardFocus.current;
    if(id)requestAnimationFrame(()=>{const node=container.current?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(id)}"]`);if(node){node.focus();pendingKeyboardFocus.current=null;}});
  };
  const graph=useMemo(()=>buildNodeGraph(rows.filter(r=>filter==='all'||r.relationship_type===filter)),[rows,filter]);
  const lastNode=trail[trail.length-1];
  const nodeId=graph.nodes.some(node=>node.id===lastNode)?lastNode:'';
  const focused=useMemo(()=>nodeId?new Set([nodeId,...graph.edges.filter(edge=>edge.source===nodeId||edge.target===nodeId).flatMap(edge=>[edge.source,edge.target])]):null,[graph,nodeId]);
  const visibleGraph=useMemo(()=>focused?{nodes:graph.nodes.filter(node=>focused.has(node.id)),edges:graph.edges.filter(edge=>edge.source===nodeId||edge.target===nodeId)}:graph,[graph,focused,nodeId]);
  useEffect(()=>{
    if(!container.current||!canvas)return;
    let frame=0;
    const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{void canvas.fitView({padding:0.25,minZoom:nodeId&&container.current&&container.current.clientWidth<500?.65:.03,duration:0});});});
    observer.observe(container.current);return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[canvas,visibleGraph,nodeId]);
  const {nodes,edges}=useMemo(()=>{
    const layout=radialGraphLayout(visibleGraph.nodes,visibleGraph.edges,nodeId);
    const nodes:Node[]=visibleGraph.nodes.map(n=>({id:n.id,type:'evidence',data:{label:n.label,kind:n.kind,color:palette(n.kind)},position:layout.get(n.id)!,selected:n.id===nodeId,ariaLabel:`${n.kind}: ${n.label}`,style:{width:160,height:116,background:'transparent',border:0}}));
    const edges:Edge[]=visibleGraph.edges.map(e=>{const active=e.id===selectedId;return {id:e.id,source:e.source,target:e.target,type:'straight',label:active?relationshipLabel(e.relationship.relationship_type):undefined,ariaLabel:relationshipLabel(e.relationship.relationship_type),markerEnd:{type:MarkerType.ArrowClosed,color:active?'#93c5fd':'#7186a6'},labelStyle:{fill:'#dbeafe',fontSize:11,fontWeight:600},labelShowBg:true,labelBgStyle:{fill:'#0b1d3b',fillOpacity:.95},labelBgPadding:[7,4],labelBgBorderRadius:5,style:{stroke:active?'#93c5fd':'#496483',strokeWidth:active?2.5:1.2,strokeDasharray:e.relationship.relationship_type==='references'?'5 5':undefined},interactionWidth:24}});
    return {nodes,edges};
  },[visibleGraph,nodeId,selectedId]);
  const positionedNodes=useMemo(()=>nodes.map(node=>({...node,position:positions[node.id]??node.position})),[nodes,positions]);
  const incident=graph.edges.filter(e=>!nodeId||e.source===nodeId||e.target===nodeId);
  const preview=(id:string)=>{const candidates=graph.edges.filter(edge=>edge.source===id||edge.target===id);const row=candidates.find(edge=>edge.relationship.relationship_type==='covered_by')??candidates.find(edge=>edge.relationship.source_entity_id===id)??candidates[0];if(id&&row)onPreview?.(row.relationship);};
  const browse=(id:string)=>{preview(id);setQuery('');setPositions({});setTrail(previous=>previous[previous.length-1]===id?previous:[...previous.slice(-19),id]);};
  const back=()=>{const previous=trail.length>1?trail.slice(0,-1):[''];preview(previous[previous.length-1]);setPositions({});setTrail(previous);};
  const kinds=[...new Set(graph.nodes.map(node=>node.kind))];
  const selected=graph.nodes.find(node=>node.id===nodeId);
  return <div className="min-w-0 w-full reg-node-map reg-network-studio">
    <div className="reg-studio-heading"><div><p>REGULATORY CONNECTIONS</p><h3>Explore the evidence network</h3></div><span>Reviewed sources only</span></div>
    <div className="reg-studio-meta"><p className="sr-only">Select a node to explore its direct connections, then select a labeled link for page-cited evidence. Drag nodes to arrange the map; use zoom and fit controls to navigate. Press Enter or Space on a focused node to explore its connections.</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{visibleGraph.nodes.length} of {graph.nodes.length} nodes · {visibleGraph.edges.length} of {graph.edges.length} links</span></div>
    <div className="reg-studio-tools">
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Connection type <select className="border rounded p-2 block max-w-full" value={filter} onChange={e=>{setFilter(e.target.value);setTrail(['']);setPositions({});}}><option value="all">All reviewed types</option>{[...new Set(rows.map(r=>r.relationship_type))].map(t=><option key={t} value={t}>{relationshipLabel(t)}</option>)}</select></label>
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Browse node <select className="border rounded p-2 block max-w-full" value={nodeId} onChange={e=>browse(e.target.value)}><option value="">All nodes</option>{graph.nodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
    <label className="text-sm min-w-0 reg-node-search">Find a node<input aria-label="Find a relationship node" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a certificate, bulletin or regulation" className="block border rounded p-2 mt-1 w-full"/></label>
    </div>
    <nav aria-label="Graph exploration history" className="flex flex-wrap items-center gap-2 mb-3 text-xs">
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40" disabled={trail.length<2} onClick={back}>Back one node</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" onClick={()=>{setQuery('');browse('');}}>Show all nodes</button>
      <button className="rounded border border-slate-300 px-3 py-2 font-semibold" onClick={()=>void canvas?.fitView({padding:0.2,minZoom:nodeId&&container.current&&container.current.clientWidth<500?.65:.03,duration:0})}>Fit map</button>
      <ol className="flex flex-wrap gap-x-2 gap-y-1 min-w-0" aria-label="Exploration trail">{trail.map((id,index)=>{const label=id?graph.nodes.find(n=>n.id===id)?.label:'All nodes';return label?<li key={index} className="min-w-0 break-words"><span aria-hidden="true">{index>0?'› ':''}</span><button className="text-blue-700 underline text-left" aria-current={index===trail.length-1?'location':undefined} onClick={()=>{preview(id);setTrail(trail.slice(0,index+1));setPositions({});}}>{label}</button></li>:null;})}</ol>
    </nav>
    {query.trim()&&<div className="mb-3" aria-label="Node search results"><p className="text-xs text-slate-600 mb-2">Matches within the current model and connection-type filters.</p><ul className="max-h-48 overflow-auto space-y-1">{graph.nodes.filter(n=>n.label.toLowerCase().includes(query.trim().toLowerCase())).map(n=><li key={n.id}><button className="border rounded p-2 w-full text-sm text-left hover:bg-blue-50" onClick={()=>browse(n.id)}>{n.label}</button></li>)}</ul>{!graph.nodes.some(n=>n.label.toLowerCase().includes(query.trim().toLowerCase()))&&<p role="status" className="text-sm">No matching nodes. Try another search or connection type.</p>}</div>}
    {selected&&<section aria-label="Focused graph node" className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Exploring · {selected.kind}</p><h3 className="mt-1 font-bold break-words">{selected.label}</h3><p className="mt-1 text-sm text-slate-600">{incident.length} direct reviewed {incident.length===1?'connection':'connections'}. Follow a neighboring node or select a link to read its source.</p></section>}
    <div ref={container} className="h-[620px] lg:h-[720px] reg-network-canvas overflow-hidden" aria-label="Interactive relationship node-link diagram" aria-describedby="node-map-status" onKeyDownCapture={event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      const node=(event.target as HTMLElement).closest<HTMLElement>('.react-flow__node');
      if(!node?.dataset.id)return;
      event.preventDefault();event.stopPropagation();const id=node.dataset.id;
      pendingKeyboardFocus.current=id===nodeId?null:id;browse(id);
    }}>
      <ReactFlow key={`${filter}:${nodeId}`} onInit={initializeCanvas} nodeTypes={nodeTypes} nodes={positionedNodes} edges={edges} fitView fitViewOptions={{padding:0.2}} minZoom={0.03} maxZoom={2} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} onNodesChange={changes=>setPositions(previous=>{const moved=changes.filter(change=>change.type==='position'&&change.position&&(previous[change.id]?.x!==change.position.x||previous[change.id]?.y!==change.position.y));if(!moved.length)return previous;const next={...previous};for(const change of moved)if(change.type==='position'&&change.position)next[change.id]=change.position;return next;})} onNodeClick={(_,n)=>browse(n.id)} onEdgeClick={(_,e)=>{const row=graph.edges.find(r=>r.id===e.id)?.relationship;if(row)onSelect(row);}}><Background color="#315681" gap={36} size={1}/><Controls showInteractive={false}/></ReactFlow>
    </div>
    <p id="node-map-status" className="text-xs text-slate-500 my-3" aria-live="polite">{selected?`${selected.label}: ${incident.length} direct reviewed connection${incident.length===1?'':'s'} shown below.`:'Arrows preserve reviewed direction. Dashed links are references; shared nodes use one canonical catalog identity.'}</p>
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Node type legend">{kinds.map(kind=>{const color=palette(kind);return <span key={kind} className="flex items-center gap-1.5 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{background:color,border:`2px solid ${color}`}}/>{kind}</span>})}</div>
    <h3 className="font-semibold text-sm mt-4 mb-2">{selected?'Connections to explore':'Reviewed connections'}</h3>
    <ul aria-label="Node connections" className="space-y-2 max-h-80 overflow-auto">{incident.map(e=>{const source=graph.nodes.find(n=>n.id===e.source);const target=graph.nodes.find(n=>n.id===e.target);const neighbor=nodeId?(e.source===nodeId?target:source):null;return <li key={e.id} className={`rounded-lg border p-3 ${selectedId===e.id?'bg-blue-50 border-blue-500':'border-slate-200'}`}>
      <button aria-pressed={selectedId===e.id} className="w-full text-left text-sm rounded focus-visible:outline-2 focus-visible:outline-blue-600" onClick={()=>onSelect(e.relationship)}>{source?.label} → {target?.label}<span className="block text-xs text-slate-600 mt-1">{relationshipLabel(e.relationship.relationship_type)} · Read source evidence</span>{profileRelevance(profile,e.relationship)&&<span className="block text-xs text-blue-800 mt-1">{profileRelevance(profile,e.relationship)!.label}</span>}</button>
      <div className="flex flex-wrap gap-2 mt-2">{(neighbor?[neighbor]:[source,target]).filter((node):node is NonNullable<typeof node>=>!!node).map(node=><button key={node.id} className="text-xs text-blue-800 border border-blue-200 rounded-md bg-white px-2 py-1 text-left break-words" onClick={()=>browse(node.id)}>Explore {node.label}</button>)}</div>
    </li>;})}</ul>
    {!incident.length&&<p className="text-sm">No reviewed connections match this filter.</p>}
  </div>;
}
