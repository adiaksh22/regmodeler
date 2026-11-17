import {test as base,expect} from '@playwright/test';
import type {EvidenceRelationship} from '../../src/domain/explorer';

// Synthetic integration contract. None of these excerpts/facts are regulatory evidence.
const origin='https://browser-fixture.invalid';
export const versionId='10000000-0000-4000-8000-000000000001';
export const boeingModels=['737-100 Series','737-200 Series','737-200C Series','737-300 Series','737-400 Series','737-500 Series','737-600 Series','737-700','737-700C Series','737-800','737-900 Series','737-900ER','737-7','737-8','737-9','737-8200','737-10'];
export const documents=[
 {tcds_number:'2A13',model:'PA-28-140 | PA-28-181',holder:'Piper Aircraft Inc.',revision:'66'},
 {tcds_number:'A16WE',model:boeingModels.join(' | '),holder:'The Boeing Company',revision:'83'},
 {tcds_number:'E7CE',model:'Fixture engine',holder:'Fixture holder',revision:'1'},
 {tcds_number:'P19NE',model:'Fixture propeller',holder:'Fixture holder',revision:'1'},
].map(row=>({...row,authority:'FAA',product_type:row.tcds_number==='E7CE'?'Engine':row.tcds_number==='P19NE'?'Propeller':'Aircraft',status:'current',revision_date:'2026-11-13',retrieved_at:'2026-11-16T00:00:00Z',url:`${origin}/fixture-source/${row.tcds_number}`}));
const row=(model:string,certificate:string,overrides:Partial<EvidenceRelationship>={}):EvidenceRelationship=>({
 id:`${model}:certificate`,model,tcds_number:certificate,target:certificate,target_type:'certificate',relationship_type:'covered_by',
 evidence_page:1,evidence_excerpt:'Synthetic browser fixture. Not FAA source text.',evidence_revision:certificate==='A16WE'?'83':'66',source_url:`${origin}/fixture-source/${certificate}`,evidence_version_id:versionId,
 applicability_conditions:{},direction:'outgoing',model_entity_id:`model:${model}`,source_entity_id:`model:${model}`,target_entity_id:`certificate:${certificate}`,...overrides,
});
export const familyRows=boeingModels.flatMap((model,index)=>[
 row(model,'A16WE'),
 row(model,'A16WE',{id:`${model}:family`,target:'Boeing 737 family',target_type:'aircraft_family',target_entity_id:'family:737',relationship_type:'member_of'}),
 ...(index<7?[row(model,'A16WE',{id:`${model}:engine`,target:`Fixture engine ${index%2+1}`,target_type:'engine_model',target_entity_id:`engine:${index%2+1}`,relationship_type:'powered_by'})]:[]),
]);
export const piperRows=['PA-28-140','PA-28-181'].flatMap(model=>[
 row(model,'2A13'),
 row(model,'2A13',{id:`${model}:AD`,target:'Fixture AD',target_type:'AD',target_entity_id:'ad:fixture',relationship_type:'applies_to',source_document_type:'AD',source_document_number:'Fixture AD',evidence_page:5,applicability_conditions:{serial_ranges:'28-20001 through 28-26946'}}),
 row(model,'2A13',{id:`${model}:reference`,target:'Fixture bulletin',target_type:'service_document',relationship_type:'references',path_via:'Fixture AD',source_entity_id:'ad:fixture',target_entity_id:'bulletin:fixture',source_document_type:'AD',source_document_number:'Fixture AD',evidence_page:6}),
]);
type Read={method:string;path:string;query:URLSearchParams;body:Record<string,unknown>|null};
type State={reads:Read[];unexpected:string[];errors:string[];fail:Set<string>;incompleteGraph:boolean};
export const test=base.extend<{api:State}>({
 api:[async({context,page},use)=>{
  const state:State={reads:[],unexpected:[],errors:[],fail:new Set(),incompleteGraph:false};
  context.on('page',tab=>tab.on('pageerror',error=>state.errors.push(error.message)));page.on('pageerror',error=>state.errors.push(error.message));
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin==='http://127.0.0.1:4183'&&['GET','HEAD'].includes(request.method()))return route.continue();
   if(url.origin!==origin){state.unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);return route.abort('blockedbyclient');}
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-expose-headers':'content-range','access-control-allow-headers':request.headers()['access-control-request-headers']||'apikey,authorization,content-type,x-client-info,prefer,range,range-unit'};
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const endpoint=url.pathname.split('/').at(-1)!;
   const read:Read={method:request.method(),path:endpoint,query:url.searchParams,body:request.postData()?JSON.parse(request.postData()!):null};state.reads.push(read);
   const reply=(data:unknown,count?:number)=>route.fulfill({status:200,headers:{...headers,'content-type':'application/json',...(count!==undefined?{'content-range':`0-${Math.max(0,count-1)}/${count}`}:{})},body:JSON.stringify(data)});
   if(state.fail.has(endpoint))return route.fulfill({status:503,headers,body:'{"message":"Fixture outage"}'});
   if(endpoint==='search_tcds'){
    const query=String(read.body?.search_query??'').toLowerCase();
    return reply(documents.filter(doc=>[doc.model,doc.tcds_number,doc.holder].some(value=>value.toLowerCase().includes(query))));
   }
   if(endpoint==='tcds_catalog')return reply(documents.filter(doc=>`eq.${doc.tcds_number}`===url.searchParams.get('tcds_number')));
   if(endpoint==='model_graph'){
    const certificate=url.searchParams.get('tcds_number'),model=url.searchParams.get('model');
    const rows=[...familyRows,...piperRows].filter(row=>`eq.${row.tcds_number}`===certificate&&(!model||`eq.${row.model}`===model));
    return reply(state.incompleteGraph?rows.slice(1):rows,rows.length);
   }
   if(endpoint==='aircraft_variant_catalog')return reply([],0);
   if(endpoint==='source_monitoring_coverage')return reply([]);
   if(endpoint==='relationship_applicability_rules'||endpoint==='regulation_sources'||endpoint==='source_quality_details')return reply([]);
   if(endpoint==='source_change_feed')return reply([],0);
   if(endpoint==='tcds_versions')return reply([{id:versionId,document_id:versionId,tcds_number:'2A13',revision:'66',revision_date:'2026-11-13',status:'current',source_url:`${origin}/fixture-source/2A13`,retrieved_at:'2026-11-16T00:00:00Z',content_sha256:'a'.repeat(64),is_current:true}]);
   if(endpoint==='source-viewer')return reply({url:`${origin}/storage/fixture-frame`,expiresIn:300});
   if(endpoint==='fixture-frame')return route.fulfill({status:200,headers,contentType:'text/html',body:'<!doctype html><title>Simulated archive</title><p>Browser fixture frame; not an FAA PDF.</p><button>Frame focus target</button>'});
   if(endpoint==='related_last_checked'||endpoint==='search_related_documents_with_review')return reply([]);
   if(endpoint==='search_review_queue')return reply({rows:[],total:0,reviewed_count:0});
   state.unexpected.push(`${request.method()} ${url.pathname}`);return route.abort('blockedbyclient');
  });
  await use(state);
  expect(state.errors,'Uncaught browser errors').toEqual([]);
  expect(state.unexpected,'Unexpected traffic or endpoint').toEqual([]);
  expect(state.reads.filter(read=>JSON.stringify(read.body).includes('CI private')),'Private profile fields must not enter API bodies').toEqual([]);
 },{auto:true}],
});
export {expect};
export async function openMap(page:import('@playwright/test').Page){
 await page.getByRole('button',{name:'Node map',exact:true}).click();
 await expect(page.locator('.reg-network-canvas')).toHaveAttribute('data-motion','settled');
}
