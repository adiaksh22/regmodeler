import {useId} from 'react';
import {BaseEdge,useInternalNode,type EdgeProps} from '@xyflow/react';
import {circleLink,graphSymbol} from '../domain/graphGeometry';

export default function EvidenceGraphEdge({id,source,target,label,style,labelStyle,labelBgStyle,labelBgPadding,labelBgBorderRadius,interactionWidth}:EdgeProps){
 const marker=`evidence-arrow-${useId().replaceAll(':','')}`;
 const from=useInternalNode(source);const to=useInternalNode(target);
 if(!from||!to)return null;
 const circle=(node:typeof from)=>({x:node.internals.positionAbsolute.x+graphSymbol.centerX,y:node.internals.positionAbsolute.y+graphSymbol.centerY,radius:node.selected?graphSymbol.focusedRadius:graphSymbol.radius});
 const edge=circleLink(circle(from),circle(to));if(!edge)return null;
 const color=String(style?.stroke??'#7186a6');
 return <g data-source-node={source} data-target-node={target}>
  <defs><marker id={marker} viewBox="0 0 9 8" refX="9" refY="4" markerWidth="9" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M 0 0 L 9 4 L 0 8 Z" fill={color}/></marker></defs>
  <BaseEdge id={id} path={edge.path} markerEnd={`url(#${marker})`} label={label} labelX={edge.labelX} labelY={edge.labelY} style={style} labelStyle={labelStyle} labelShowBg labelBgStyle={labelBgStyle} labelBgPadding={labelBgPadding} labelBgBorderRadius={labelBgBorderRadius} interactionWidth={interactionWidth}/>
 </g>;
}
