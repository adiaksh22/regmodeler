import {describe,expect,it} from 'vitest';
import {circleLink} from './graphGeometry';
describe('circle edge boundaries',()=>{
 it.each([[200,0],[0,200],[-200,0],[0,-200],[150,200],[-150,-200]])('anchors each end to the visible symbol at %s,%s',(x,y)=>{
  const edge=circleLink({x:0,y:0,radius:19},{x,y,radius:28})!;
  expect(Math.hypot(edge.start.x,edge.start.y)).toBeCloseTo(19);
  expect(Math.hypot(edge.end.x-x,edge.end.y-y)).toBeCloseTo(28);
  expect(edge.end.x-edge.start.x).toBeCloseTo(x*(1-47/Math.hypot(x,y)));
 });
 it('omits an overlapping path rather than drawing a reversed arrow',()=>{
  expect(circleLink({x:0,y:0,radius:28},{x:0,y:0,radius:19})).toBeNull();
 });
});
