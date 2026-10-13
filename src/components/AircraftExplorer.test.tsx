import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AircraftExplorer,{sourceDate} from './AircraftExplorer';
import { tcdsSamples } from '../data/tcdsSamples';

describe('aircraft evidence presentation',()=>{
  it('shows explicit empty coverage and does not claim missing relationships are inapplicable',()=>{
    const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/tcds/2A13?model=PA-28-161']}><AircraftExplorer doc={{...tcdsSamples[0],authority:'FAA'}} details={{revisions:[],relationships:[],lastChecked:null,available:true}}/></MemoryRouter>);
    expect(html).toContain('PA-28-161');expect(html).toContain('No reviewed relationships');expect(html).toContain('applicability and compliance are not determined');
  });
  it('uses UTC for regulatory dates and handles missing dates',()=>{
    expect(sourceDate('2025-10-10')).toContain('10');
    expect(sourceDate(null)).toBe('Not recorded');
    expect(sourceDate('invalid')).toBe('Not recorded');
  });
});
