export const graphSymbol={centerX:80,centerY:30,radius:19,focusedRadius:28};
type Circle={x:number;y:number;radius:number};
export function circleLink(source:Circle,target:Circle){
 const dx=target.x-source.x;const dy=target.y-source.y;const length=Math.hypot(dx,dy);
 if(length<=source.radius+target.radius){
  // Keep a visible, directed route during short layout transitions as circles pass.
  const ux=length?dx/length:1;const uy=length?dy/length:0;const nx=-uy;const ny=ux;
  const start={x:source.x+nx*source.radius,y:source.y+ny*source.radius};
  const end={x:target.x+nx*target.radius,y:target.y+ny*target.radius};
  const bend=Math.max(80,source.radius+target.radius+24);
  return {start,end,labelX:(source.x+target.x)/2+nx*bend,labelY:(source.y+target.y)/2+ny*bend,
   path:`M ${start.x},${start.y} C ${start.x+ux*bend+nx*bend},${start.y+uy*bend+ny*bend} ${end.x-ux*bend+nx*bend},${end.y-uy*bend+ny*bend} ${end.x},${end.y}`};
 }
 const ux=dx/length;const uy=dy/length;
 const start={x:source.x+ux*source.radius,y:source.y+uy*source.radius};
 const end={x:target.x-ux*target.radius,y:target.y-uy*target.radius};
 return {start,end,labelX:(start.x+end.x)/2,labelY:(start.y+end.y)/2,path:`M ${start.x},${start.y} L ${end.x},${end.y}`};
}
