import {useMemo,useState} from 'react';
import {ReactFlow,Background,Controls,MarkerType,type Node,type Edge,type ReactFlowInstance} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import type {EvidenceRelationship} from '../domain/explorer';
import {buildNodeGraph,relationshipLabel} from '../domain/nodeGraph';

export default function NodeGraph({rows,onSelect,selectedId}:{rows:EvidenceRelationship[];onSelect:(row:EvidenceRelationship)=>void;selectedId:string}) {
  const [nodeId,setNodeId]=useState('');
  const [filter,setFilter]=useState('all');
  const [query,setQuery]=useState('');
  const [positions,setPositions]=useState<Record<string,{x:number;y:number}>>({});
  const [canvas,setCanvas]=useState<ReactFlowInstance|null>(null);
  const graph=useMemo(()=>buildNodeGraph(rows.filter(r=>filter==='all'||r.relationship_type===filter)),[rows,filter]);
  const {nodes,edges}=useMemo(()=>{
    const layout=new dagre.graphlib.Graph().setDefaultEdgeLabel(()=>({})).setGraph({rankdir:'LR',nodesep:30,ranksep:140});
    graph.nodes.forEach(n=>layout.setNode(n.id,{width:210,height:74}));
    graph.edges.forEach(e=>layout.setEdge(e.source,e.target));dagre.layout(layout);
    const nodes:Node[]=graph.nodes.map(n=>({id:n.id,data:{label:<><span className="block text-xs text-slate-500">{n.kind}</span><strong>{n.label}</strong></>},position:{x:layout.node(n.id).x-105,y:layout.node(n.id).y-37},sourcePosition:'right' as Node['sourcePosition'],targetPosition:'left' as Node['targetPosition'],style:{width:210,minHeight:74,borderColor:n.id===nodeId?'#2563eb':'#94a3b8',background:n.kind==='Aircraft model'?'#eff6ff':'white'}}));
    const edges:Edge[]=graph.edges.map(e=>({id:e.id,source:e.source,target:e.target,label:relationshipLabel(e.relationship.relationship_type),markerEnd:{type:MarkerType.ArrowClosed},style:{stroke:e.id===selectedId?'#2563eb':'#64748b',strokeWidth:e.id===selectedId?3:1.5},interactionWidth:24}));
    return {nodes,edges};
  },[graph,nodeId,selectedId]);
  const incident=graph.edges.filter(e=>!nodeId||e.source===nodeId||e.target===nodeId);
  const browse=(id:string)=>{setNodeId(id);const node=nodes.find(n=>n.id===id);if(node){const position=positions[id]??node.position;void canvas?.setCenter(position.x+105,position.y+37,{zoom:0.9,duration:250});}else void canvas?.fitView({padding:0.15,duration:250});};
  return <div className="min-w-0 w-full">
    <p className="text-sm text-slate-600 mb-3">Select a node to browse its connections, then select a connection for evidence. Drag nodes to arrange the view; use zoom and fit controls to navigate.</p>
    <div className="flex flex-wrap gap-3 mb-3">
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Connection type <select className="border rounded p-2 block max-w-full" value={filter} onChange={e=>{setFilter(e.target.value);setNodeId('');}}><option value="all">All reviewed types</option>{[...new Set(rows.map(r=>r.relationship_type))].map(t=><option key={t} value={t}>{relationshipLabel(t)}</option>)}</select></label>
      <label className="text-sm min-w-0 max-w-full w-full sm:w-auto">Browse node <select className="border rounded p-2 block max-w-full" value={nodeId} onChange={e=>browse(e.target.value)}><option value="">All nodes</option>{graph.nodes.map(n=><option key={n.id} value={n.id}>{n.label}</option>)}</select></label>
    </div>
    <label className="block text-sm mb-3">Find a node<input aria-label="Find a relationship node" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a certificate, bulletin or regulation" className="block border rounded p-2 mt-1 w-full"/></label>
    {query.trim()&&<div className="mb-3" aria-label="Node search results"><p className="text-xs text-slate-600 mb-2">Matches within the current model and connection-type filters.</p><ul className="max-h-48 overflow-auto space-y-1">{graph.nodes.filter(n=>n.label.toLowerCase().includes(query.trim().toLowerCase())).map(n=><li key={n.id}><button className="border rounded p-2 w-full text-sm text-left hover:bg-blue-50" onClick={()=>browse(n.id)}>{n.label}</button></li>)}</ul>{!graph.nodes.some(n=>n.label.toLowerCase().includes(query.trim().toLowerCase()))&&<p role="status" className="text-sm">No matching nodes. Try another search or connection type.</p>}</div>}
    <div className="h-[520px] border rounded-xl overflow-hidden bg-slate-50" aria-label="Interactive relationship nodes">
      <ReactFlow key={filter} onInit={setCanvas} nodes={nodes.map(n=>({...n,position:positions[n.id]??n.position}))} edges={edges} fitView fitViewOptions={{padding:0.15}} minZoom={0.1} maxZoom={2} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} onNodesChange={changes=>setPositions(previous=>{const next={...previous};for(const change of changes)if(change.type==='position'&&change.position)next[change.id]=change.position;return next;})} onNodeClick={(_,n)=>setNodeId(n.id)} onEdgeClick={(_,e)=>{const row=graph.edges.find(r=>r.id===e.id)?.relationship;if(row)onSelect(row);}} onPaneClick={()=>setNodeId('')}><Background/><Controls showInteractive={false}/></ReactFlow>
    </div>
    <p className="text-xs text-slate-500 my-3">Arrows preserve the direction of the reviewed relationship. Shared nodes use catalog identities, including the cited amendment edition.</p>
    <ul aria-label="Node connections" className="space-y-2 max-h-64 overflow-auto">{incident.map(e=><li key={e.id}><button className={`w-full text-left text-sm border rounded p-2 ${selectedId===e.id?'bg-blue-50 border-blue-600':''}`} onClick={()=>onSelect(e.relationship)}>{graph.nodes.find(n=>n.id===e.source)?.label} → {graph.nodes.find(n=>n.id===e.target)?.label}<span className="block text-xs text-slate-500">{relationshipLabel(e.relationship.relationship_type)}</span></button></li>)}</ul>
    {!incident.length&&<p className="text-sm">No reviewed connections match this filter.</p>}
  </div>;
}
