import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import SourceMonitoring from './SourceMonitoring';
describe('source coverage disclosure',()=>{
 it('shows a successful query with scope gaps instead of claiming complete coverage',()=>{
  const checked=new Date().toISOString();
  const html=renderToStaticMarkup(<SourceMonitoring certificate="2A13" type="STC" checks={[{
   source:'FAA:STC:PA28',last_success:checked,last_attempt:checked,status:'succeeded',baseline_ready:true,
   returned_count:857,accepted_count:849,quarantined_count:8,coverage_checked_at:checked,
  }]}/>);
  expect(html).toContain('Checked with scope gaps');expect(html).toContain('857 returned');
  expect(html).toContain('849 exact-match candidates');expect(html).toContain('8 scope unconfirmed');
  expect(html).toContain('not been treated as missing from its index');expect(html).not.toContain('Recently checked');
  expect(html).not.toContain('Boeing 737');
 });
});
