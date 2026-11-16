import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AircraftExplorer,{sourceDate} from './AircraftExplorer';
import { tcdsSamples } from '../data/tcdsSamples';
import type {EvidenceRelationship} from '../domain/explorer';

describe('aircraft evidence presentation',()=>{
  it('does not substitute another family member citation when current TCDS paths are suspended',()=>{
    const row={id:'other',tcds_number:'A16WE',model:'737-700',target:'AD example',target_type:'AD',relationship_type:'applies_to',direction:'incoming',evidence_page:1,evidence_excerpt:'Other model evidence must remain unselected.',applicability_conditions:{},evidence_revision:'1',source_url:'https://drs.faa.gov'} as EvidenceRelationship;
    const doc={...tcdsSamples.find(doc=>doc.tcds_number==='A16WE')!,authority:'FAA'};
    const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/tcds/A16WE?model=737-100%20Series']}><AircraftExplorer doc={doc} details={{revisions:[],relationships:[row],lastChecked:null,available:true}}/></MemoryRouter>);
    expect(html).toContain('Model context:');expect(html).toContain('No selected source citation');expect(html).not.toContain('Other model evidence must remain unselected.');
  });
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
