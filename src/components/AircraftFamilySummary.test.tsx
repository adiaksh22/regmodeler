import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import AircraftFamilySummary from './AircraftFamilySummary';
import ApplicabilityLogic from './ApplicabilityLogic';
import type {AircraftVariantSummary,ApplicabilityRule} from '../domain/explorer';

const variant=(changes:Partial<AircraftVariantSummary>={}):AircraftVariantSummary=>({entity_id:'7378',family_entity_id:'737',tcds_document_id:'a16we',tcds_number:'A16WE',model_key:'737-8',display_name:'737 MAX 8',market_name:'737 MAX',faa_status:'faa_approved',approved_on:'2017-03-08',evidence_version_id:'rev81',evidence_page:66,evidence_excerpt:'FAA approved model.',facts:{maximum_takeoff_weight:{numeric_value:182200,text_value:null,unit:'lb',conditions:{},evidence_page:67,evidence_excerpt:'Reviewed weight.'}},...changes});

describe('aircraft family evidence summary',()=>{
 it('separates approved models from a certification project boundary',()=>{
  const html=renderToStaticMarkup(<AircraftFamilySummary variants={[variant(),variant({entity_id:'73710',model_key:'BOEING:737-10',display_name:'737 MAX 10',faa_status:'not_listed_in_current_tcds',approved_on:null,evidence_excerpt:'Not listed in Revision 81.',facts:{}})]} selected="737-8" onSelect={()=>{}}/>);
  expect(html).toContain('182,200 lb');expect(html).toContain('737 MAX 10: not listed in current FAA TCDS');expect(html).toContain('cannot be selected as an approved aircraft model');
 });
 it('renders alternative applicability groups as explicit OR paths',()=>{
  const rule=(group:string,label:string):ApplicabilityRule=>({relationship_id:'edge',rule_set_label:'Alternative display path',outcome:'requires_review',group_id:group,group_order:group==='a'?1:2,match_operator:'all',group_label:label,predicate_id:group, predicate_order:1,subject_kind:'stc',subject_key:group==='a'?'SA01899WI':'SA02658SE',comparison:'present',expected:true,evidence_page:3,evidence_excerpt:'Reviewed'});
  const html=renderToStaticMarkup(<ApplicabilityLogic rules={[rule('a','G3X Touch path'),rule('b','GI 275 path')]}/>);
  expect(html).toContain('G3X Touch path');expect(html).toContain('GI 275 path');expect(html).toContain('OR');
 });
});
