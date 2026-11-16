import type {EvidenceRelationship} from '../domain/explorer';
export class GraphReadError extends Error {
 constructor(public readonly code:'TOO_LARGE'|'INCOMPLETE'){super(code);}
}
type GraphPage={rows:EvidenceRelationship[];total:number|null};
export async function readBoundedGraph(readPage:(offset:number,size:number)=>Promise<GraphPage>,limit:number,pageSize=250):Promise<EvidenceRelationship[]>{
 const rows:EvidenceRelationship[]=[];const seen=new Set<string>();let expected:number|undefined;
 for(let offset=0;offset<limit;offset+=pageSize){
  const page=await readPage(offset,pageSize);
  if(page.total===null||!Number.isSafeInteger(page.total)||page.total<0)throw new GraphReadError('INCOMPLETE');
  if(page.total>limit)throw new GraphReadError('TOO_LARGE');
  if(expected!==undefined&&page.total!==expected)throw new GraphReadError('INCOMPLETE');
  expected=page.total;
  if(page.rows.length!==Math.min(pageSize,Math.max(0,expected-offset)))throw new GraphReadError('INCOMPLETE');
  for(const row of page.rows){
   const key=JSON.stringify([row.model,row.id,row.path_via??null]);
   if(seen.has(key))throw new GraphReadError('INCOMPLETE');
   seen.add(key);rows.push(row);
  }
  if(rows.length===expected)return rows;
 }
 throw new GraphReadError('INCOMPLETE');
}
