import { describe, it, expect, beforeEach } from 'vitest';
import { saveDocument, getDocumentByNumber } from './documentManager';
import { getRevisionsByTCDS } from './revisionManager';
import { TCDSDocument } from '../types/tcds';

describe('localStorage integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should maintain separate storage keys', () => {
    const doc: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    saveDocument(doc);

    // Verify tcds_documents key exists
    const documentsData = localStorage.getItem('tcds_documents');
    expect(documentsData).toBeTruthy();
    const documents = JSON.parse(documentsData!);
    expect(documents).toHaveLength(1);
    expect(documents[0].tcds_number).toBe('P19NE');

    // Verify tcds_revisions key exists (map format)
    const revisionsData = localStorage.getItem('tcds_revisions');
    expect(revisionsData).toBeTruthy();
    const revisions = JSON.parse(revisionsData!);
    expect(revisions).toHaveProperty('P19NE');
    expect(revisions['P19NE']).toHaveLength(1);
    expect(revisions['P19NE'][0].tcds_number).toBe('P19NE');

    // Verify other keys are not affected
    expect(localStorage.getItem('tcds_change_log_entries')).toBeNull();
    expect(localStorage.getItem('tcds_issues')).toBeNull();
  });

  it('should update current snapshot and append revision', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    saveDocument(doc1);

    // Update with new revision
    const doc2: TCDSDocument = {
      ...doc1,
      revision: '9',
      revision_date: '12/15/2024'
    };

    saveDocument(doc2);

    // Current snapshot should show latest
    const current = getDocumentByNumber('P19NE');
    expect(current?.revision).toBe('9');
    expect(current?.revision_date).toBe('12/15/2024');

    // Revisions should have both
    const revisions = getRevisionsByTCDS('P19NE');
    expect(revisions).toHaveLength(2);
    expect(revisions[0].revision).toBe('9'); // Latest first
    expect(revisions[1].revision).toBe('8');
  });

  it('should not create phantom revisions on refresh', () => {
    const doc: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    saveDocument(doc);
    const revisions1 = getRevisionsByTCDS('P19NE');
    expect(revisions1).toHaveLength(1);
    expect(revisions1[0].content_length).toBeGreaterThan(0);

    // Save identical document again
    saveDocument(doc);
    const revisions2 = getRevisionsByTCDS('P19NE');
    expect(revisions2).toHaveLength(1); // Should still be 1

    // Save with only whitespace differences
    const doc2 = { ...doc, revision: ' 8 ', model: ' MTV-6-( ) ' };
    saveDocument(doc2);
    const revisions3 = getRevisionsByTCDS('P19NE');
    expect(revisions3).toHaveLength(1); // Should still be 1
  });

  it('should preserve existing localStorage keys behavior', () => {
    // Simulate existing data
    localStorage.setItem('tcds_change_log_entries', JSON.stringify([
      { id: '1', tcds_number: 'TEST', detected_at: '2024-01-01', change_type: 'revision_updated', summary: 'test', old_hash: 'abc', new_hash: 'def' }
    ]));
    localStorage.setItem('tcds_issues', JSON.stringify([
      { id: '1', tcds_number: 'TEST', issue_type: 'test', field_name: 'test', table_value: 'a', source_value: 'b', status: 'open' }
    ]));

    const doc: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    saveDocument(doc);

    // Existing keys should be unchanged
    const changeLog = JSON.parse(localStorage.getItem('tcds_change_log_entries')!);
    expect(changeLog).toHaveLength(1);
    expect(changeLog[0].tcds_number).toBe('TEST');

    const issues = JSON.parse(localStorage.getItem('tcds_issues')!);
    expect(issues).toHaveLength(1);
    expect(issues[0].tcds_number).toBe('TEST');
  });
  it('should migrate old flat array format to new map format', () => {
    // Simulate old format data
    const oldFormat = [
      {
        id: '1',
        tcds_number: 'P19NE',
        timestamp: '2024-01-01T00:00:00Z',
        revision: '8',
        revision_date: '07/08/2021',
        model: 'MTV-6-( )',
        status: 'current' as const,
        holder: 'MT-Propeller',
        url: 'https://example.com',
        content_hash: 'abc123',
        content_length: 150
      },
      {
        id: '2',
        tcds_number: 'E7CE',
        timestamp: '2024-01-02T00:00:00Z',
        revision: '23',
        revision_date: '03/15/2023',
        model: 'IO-360-L2A',
        status: 'current' as const,
        holder: 'Textron Lycoming',
        url: 'https://example.com',
        content_hash: 'def456',
        content_length: 160
      }
    ];

    localStorage.setItem('tcds_revisions', JSON.stringify(oldFormat));

    // Trigger migration by reading
    const p19neRevisions = getRevisionsByTCDS('P19NE');
    expect(p19neRevisions).toHaveLength(1);
    expect(p19neRevisions[0].tcds_number).toBe('P19NE');

    const e7ceRevisions = getRevisionsByTCDS('E7CE');
    expect(e7ceRevisions).toHaveLength(1);
    expect(e7ceRevisions[0].tcds_number).toBe('E7CE');

    // Verify storage is now in map format
    const revisionsData = localStorage.getItem('tcds_revisions');
    const revisions = JSON.parse(revisionsData!);
    expect(revisions).toHaveProperty('P19NE');
    expect(revisions).toHaveProperty('E7CE');
    expect(Array.isArray(revisions)).toBe(false);
  });
});
