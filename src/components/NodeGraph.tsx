import {useMemo,useState} from 'react';
import {ReactFlow,Background,Controls,MarkerType,type Node,type Edge,type ReactFlowInstance} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import type {EvidenceRelationship} from '../domain/explorer';
import {buildNodeGraph,relationshipLabel} from '../domain/nodeGraph';

const palette=(kind:string)=>{
  const value=kind.toLowerCase();
  if(value==='aircraft model')return {border:'#1d4ed8',background:'#eff6ff',accent:'#1d4ed8'};
  if(value.includes('family'))return {border:'#7c3aed',background:'#f5f3ff',accent:'#7c3aed'};
  if(value.includes('engine')||value.includes('appliance'))return {border:'#0f766e',background:'#f0fdfa',accent:'#0f766e'};
  if(value.includes('regulatory'))return {border:'#b45309',background:'#fffbeb',accent:'#b45309'};
  if(value.includes('service'))return {border:'#475569',background:'#f8fafc',accent:'#475569'};
  return {border:'#64748b',background:'#ffffff',accent:'#475569'};
};

export default function NodeGraph({rows,onSelect,selectedId}:{rows:EvidenceRelationship[];onSelect:(row:EvidenceRelationship)=>void;selectedId:string}) {
  const [nodeId,setNodeId]=useState('');
  const [filter,setFilter]=useState('all');
  const [query,setQuery]=useState('');
  const [positions,setPositions]=useState<Record<string,{x:number;y:number}>>({});
  const [canvas,setCanvas]=useState<ReactFlowInstance|null>(null);
  const graph=useMemo(()=>buildNodeGraph(rows.filter(r=>filter==='all'||r.relationship_type===filter)),[rows,filter]);
  const focused=useMemo(()=>nodeId?new Set(graph.edges.filter(edge=>edge.source===nodeId||edge.target===nodeId).flatMap(edge=>[edge.source,edge.target])):null,[graph,nodeId]);
  const {nodes,edges}=useMemo(()=>{
    const layout=new dagre.graphlib.Graph().setDefaultEdgeLabel(()=>({})).setGraph({rankdir:'LR',nodesep:30,ranksep:140});
    graph.nodes.forEach(n=>layout.setNode(n.id,{width:210,height:74}));
    graph.edges.forEach(e=>layout.setEdge(e.source,e.target));dagre.layout(layout);
    const nodes:Node[]=graph.nodes.map(n=>{const colors=palette(n.kind);return {id:n.id,data:{label:<div className="leading-tight"><span className="block text-[10px] font-bold uppercase tracking-wider" style={{color:colors.accent}}>{n.kind}</span><strong className="mt-1 block text-sm text-slate-950">{n.label}</strong></div>},position:{x:layout.node(n.id).x-105,y:layout.node(n.id).y-37},sourcePosition:'right' as Node['sourcePosition'],targetPosition:'left' as Node['targetPosition'],selected:n.id===nodeId,style:{width:210,minHeight:74,borderColor:n.id===nodeId?'#0f172a':colors.border,borderWidth:n.id===nodeId?3:1.5,borderRadius:12,background:colors.background,boxShadow:n.id===nodeId?'0 10px 28px rgb(15 23 42 / .18)':'0 4px 12px rgb(15 23 42 / .06)',opacity:focused&&!focused.has(n.id)?.24:1,transition:'opacity 160ms ease, box-shadow 160ms ease'}}});
    const edges:Edge[]=graph.edges.map(e=>{const active=e.id===selectedId;const related=!nodeId||e.source===nodeId||e.target===nodeId;return {id:e.id,source:e.source,target:e.target,label:relationshipLabel(e.relationship.relationship_type),markerEnd:{type:MarkerType.ArrowClosed,color:active?'#1d4ed8':'#64748b'},labelStyle:{fill:active?'#1e3a8a':'#475569',fontSize:11,fontWeight:active?700:600},labelShowBg:true,labelBgStyle:{fill:'#ffffff',fillOpacity:.92},labelBgPadding:[5,3],labelBgBorderRadius:5,style:{stroke:active?'#1d4ed8':'#64748b',strokeWidth:active?3:1.5,opacity:related?1:.1,strokeDasharray:e.relationship.relationship_type==='references'?'5 4':undefined,transition:'opacity 160ms ease'},interactionWidth:24}});
    return {nodes,edges};
  },[graph,focused,nodeId,selectedId]);
  const incident=graph.edges.filter(e=>!nodeId||e.source===nodeId||e.target===nodeId);
  const browse=(id:string)=>{setNodeId(id);const node=nodes.find(n=>n.id===id);if(node){const position=positions[id]??node.position;void canvas?.setCenter(position.x+105,position.y+37,{zoom:0.9,duration:250});}else void canvas?.fitView({padding:0.15,duration:250});};
  const kinds=[...new Set(graph.nodes.map(node=>node.kind))];
  const selected=graph.nodes.find(node=>node.id===nodeId);
  return <div className="min-w-0 w-full reg-node-map">
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><p className="text-sm text-slate-600 max-w-2xl">Select a node to isolate its direct dependencies, then select a labeled link for page-cited evidence. Drag nodes to arrange the map; use zoom and fit controls to navigate.</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{graph.nodes.length} nodes · {graph.edges.length} links</span></div>
    <div className="flex flex-wrap gap-3 mb-3">
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Connection type <select className="border rounded p-2 block max-w-full" value={filter} onChange={e=>{setFilter(e.target.value);setNodeId('');}}><option value="all">All reviewed types</option>{[...new Set(rows.map(r=>r.relationship_type))].map(t=><option key={t} value={t}>{relationshipLabel(t)}</option>)}</select></label>
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Browse node <select className="border rounded p-2 block max-w-full" value={nodeId} onChange={e=>browse(e.target.value)}><option value="">All nodes</option>{graph.nodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
    </div>
    <label className="block text-sm mb-3">Find a node<input aria-label="Find a relationship node" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a certificate, bulletin or regulation" className="block border rounded p-2 mt-1 w-full"/></label>
    {query.trim()&&<div className="mb-3" aria-label="Node search results"><p className="text-xs text-slate-600 mb-2">Matches within the current model and connection-type filters.</p><ul className="max-h-48 overflow-auto space-y-1">{graph.nodes.filter(n=>n.label.toLowerCase().includes(query.trim().toLowerCase())).map(n=><li key={n.id}><button className="border rounded p-2 w-full text-sm text-left hover:bg-blue-50" onClick={()=>browse(n.id)}>{n.label}</button></li>)}</ul>{!graph.nodes.some(n=>n.label.toLowerCase().includes(query.trim().toLowerCase()))&&<p role="status" className="text-sm">No matching nodes. Try another search or connection type.</p>}</div>}
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Node type legend">{kinds.map(kind=>{const colors=palette(kind);return <span key={kind} className="flex items-center gap-1.5 text-xs text-slate-600"><span className="h-2.5 w-2.5 rounded-full" style={{background:colors.background,border:`2px solid ${colors.border}`}}/>{kind}</span>})}</div>
    <div className="h-[560px] border border-slate-300 rounded-2xl overflow-hidden bg-slate-50 shadow-inner" aria-label="Interactive relationship node-link diagram" aria-describedby="node-map-status">
      <ReactFlow key={filter} onInit={setCanvas} nodes={nodes.map(n=>({...n,position:positions[n.id]??n.position}))} edges={edges} fitView fitViewOptions={{padding:0.2}} minZoom={0.15} maxZoom={2} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} onNodesChange={changes=>setPositions(previous=>{const next={...previous};for(const change of changes)if(change.type==='position'&&change.position)next[change.id]=change.position;return next;})} onNodeClick={(_,n)=>browse(n.id)} onEdgeClick={(_,e)=>{const row=graph.edges.find(r=>r.id===e.id)?.relationship;if(row)onSelect(row);}} onPaneClick={()=>setNodeId('')}><Background color="#cbd5e1" gap={22}/><Controls showInteractive={false}/></ReactFlow>
    </div>
    <p id="node-map-status" className="text-xs text-slate-500 my-3" aria-live="polite">{selected?`${selected.label}: ${incident.length} direct reviewed connection${incident.length===1?'':'s'} shown below.`:'Arrows preserve reviewed direction. Dashed links are references; shared nodes use one canonical catalog identity.'}</p>
    <ul aria-label="Node connections" className="space-y-2 max-h-64 overflow-auto">{incident.map(e=><li key={e.id}><button className={`w-full text-left text-sm border rounded p-2 ${selectedId===e.id?'bg-blue-50 border-blue-600':''}`} onClick={()=>onSelect(e.relationship)}>{graph.nodes.find(n=>n.id===e.source)?.label} → {graph.nodes.find(n=>n.id===e.target)?.label}<span className="block text-xs text-slate-500">{relationshipLabel(e.relationship.relationship_type)}</span></button></li>)}</ul>
    {!incident.length&&<p className="text-sm">No reviewed connections match this filter.</p>}
  </div>;
}
