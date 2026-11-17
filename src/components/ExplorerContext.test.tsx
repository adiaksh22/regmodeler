import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import ExplorerContext from './ExplorerContext';
import type {EvidenceRelationship} from '../domain/explorer';
describe('exploration scope clarity',()=>{
 it('distinguishes selected aircraft, family focus and citation model without substituting the source revision',()=>{
  const source={model:'737-10',source_document_type:'AD',source_document_number:'2026-01-01',evidence_revision:'Original',evidence_page:5} as EvidenceRelationship;
  const html=renderToStaticMarkup(<ExplorerContext context={{model:'737-800',certificate:'A16WE',revision:'83',family:true,source,sourceVisible:false}} focus="Boeing 737 family"/>);
  expect(html).toContain('737-800 · TCDS A16WE · revision 83');expect(html).toContain('Reviewed family models');expect(html).toContain('Exploring: Boeing 737 family');expect(html).toContain('AD 2026-01-01 · Original · page 5');expect(html).toContain('Source model: 737-10 · differs from selected aircraft');expect(html).toContain('details hidden');expect(html).toContain('No saved configuration selected');
 });
 it('reports missing citations and saved configuration separately from focused source',()=>{
  const html=renderToStaticMarkup(<ExplorerContext context={{model:'PA-28-140',certificate:'2A13',revision:'66',family:false,profileName:'My aircraft',sourceVisible:true}} focus="CAR 3"/>);
  expect(html).toContain('Selected model');expect(html).toContain('Saved profile: My aircraft');expect(html).toContain('No citation selected');expect(html).toContain('Exploring: CAR 3');expect(html).not.toContain('Source model:');
 });
});
