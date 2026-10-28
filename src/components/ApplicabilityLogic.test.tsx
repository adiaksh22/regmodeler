import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ApplicabilityRule} from '../domain/explorer';
import ApplicabilityLogic from './ApplicabilityLogic';
const rule:ApplicabilityRule={relationship_id:'relationship',rule_set_label:'Aircraft conditions',outcome:'requires_review',group_id:'group',group_order:1,match_operator:'all',group_label:'Combined aircraft applicability',predicate_id:'line',predicate_order:1,subject_kind:'aircraft_line_number',subject_key:'Production line number',comparison:'inclusive_range',expected:{minimum:7399,maximum:8082},evidence_page:3,evidence_excerpt:'Reviewed line-number range.'};
describe('reviewed applicability presentation',()=>{
 it('keeps a single combined group distinct from alternatives and formats inclusive ranges',()=>{
  const html=renderToStaticMarkup(<ApplicabilityLogic rules={[rule]}/>);
  expect(html).toContain('Reviewed applicability conditions');expect(html).toContain('7399 through 8082 inclusive');expect(html).not.toContain('Alternative configuration paths');expect(html).not.toContain('&quot;minimum&quot;');
 });
 it('preserves OR between groups and uses date-neutral comparison wording',()=>{
  const html=renderToStaticMarkup(<ApplicabilityLogic rules={[rule,{...rule,group_id:'second',group_order:2,predicate_id:'date',group_label:'Alternative date scope',subject_kind:'original_certificate_date',subject_key:'Original certificate date',comparison:'at_or_before',expected:'2021-04-09'}]}/>);
  expect(html).toContain('Alternative configuration paths');expect(html).toContain('>OR<');expect(html).toContain('at or before');expect(html).not.toContain('revision at or before');
 });
});
