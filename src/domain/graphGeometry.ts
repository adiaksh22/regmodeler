export const graphSymbol={centerX:80,centerY:30,radius:19,focusedRadius:28};
type Circle={x:number;y:number;radius:number};
export function circleLink(source:Circle,target:Circle){
 const dx=target.x-source.x;const dy=target.y-source.y;const length=Math.hypot(dx,dy);
 if(length<=source.radius+target.radius)return null;
 const ux=dx/length;const uy=dy/length;
 const start={x:source.x+ux*source.radius,y:source.y+uy*source.radius};
 const end={x:target.x-ux*target.radius,y:target.y-uy*target.radius};
 return {start,end,labelX:(start.x+end.x)/2,labelY:(start.y+end.y)/2,path:`M ${start.x},${start.y} L ${end.x},${end.y}`};
}
