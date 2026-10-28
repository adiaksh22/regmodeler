import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import SourceStatus,{SourceStatusGuide} from './SourceStatus';
describe('evidence status presentation',()=>{
 it('keeps reviewed evidence and incomplete originals visible together',()=>{
  const html=renderToStaticMarkup(<SourceStatus status="reviewed" flags={['incomplete_original']} explain/>);
  expect(html).toContain('Reviewed connection');expect(html).toContain('Incomplete original');
  expect(html).toContain('limited to the available cited pages');expect(html).toContain('does not establish individual-aircraft applicability or compliance');
 });
 it('distinguishes metadata candidates, deferred sources and rejected observations',()=>{
  for(const [status,label] of [['pending','Metadata candidate'],['deferred','Review deferred'],['rejected','Excluded from reviewed graph']]){
   expect(renderToStaticMarkup(<SourceStatus status={status} explain/>)).toContain(label);
  }
  expect(renderToStaticMarkup(<SourceStatus status="rejected" explain/>)).toContain('does not establish that it is inapplicable');
 });
 it('does not infer review from an unknown or historical status',()=>{
  expect(renderToStaticMarkup(<SourceStatus status="new-server-state"/>)).toContain('Review status unavailable');
  expect(renderToStaticMarkup(<SourceStatus status="historical" explain/>)).toContain('current reviewed connection is not asserted');
 });
 it('separates record identity problems and retrieval from review',()=>{
  const html=renderToStaticMarkup(<><SourceStatus status="deferred" flags={['identity_mismatch','identity_mismatch']} explain/><SourceStatusGuide/></>);
  expect(html).toContain('Record identity mismatch');expect(html).toContain('have not been treated as equivalent');
  expect(html).toContain('A saved primary PDF describes retrieval');
 });
});
