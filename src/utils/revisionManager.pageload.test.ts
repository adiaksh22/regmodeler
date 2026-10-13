import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveRevision, getRevisionsByTCDS, hashTCDS, normalizeTCDS } from './revisionManager';
import { TCDSDocument } from '../types/tcds';

describe('Revision Manager - Page Load Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps the latest revision first when saves share a timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    try {
      const doc: TCDSDocument = {
        tcds_number: 'P19NE', revision: '8', revision_date: '07/08/2021',
        model: 'MTV-6-( )', status: 'current', url: 'https://example.com',
      };
      saveRevision(doc);
      saveRevision({ ...doc, revision: '9' });
      saveRevision({ ...doc, revision: '9' });
      expect(getRevisionsByTCDS(' p19ne ').map(revision => revision.revision)).toEqual(['9', '8']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should not create duplicate revision on repeated saves with same content', () => {
    const doc: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      holder: 'Cessna Aircraft',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    // First save
    saveRevision(doc);
    let revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(1);

    // Simulate page reload - same content
    saveRevision(doc);
    revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(1); // Should NOT create new revision
  });

  it('should not create revision when only URL changes (cache-busting)', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      holder: 'Cessna Aircraft',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    saveRevision(doc1);
    let revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(1);

    // URL changes with cache-buster
    const doc2 = { ...doc1, url: 'https://example.com/tcds/A00001SE.pdf?t=123456' };
    saveRevision(doc2);
    revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(1); // Should NOT create new revision
  });

  it('should not create revision when URL redirects to different domain', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      holder: 'Cessna Aircraft',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    saveRevision(doc1);

    // URL changes to CDN
    const doc2 = { ...doc1, url: 'https://cdn.example.com/tcds/A00001SE.pdf' };
    saveRevision(doc2);

    const revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(1); // Should NOT create new revision
  });

  it('should create revision when actual content field changes', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      holder: 'Cessna Aircraft',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    saveRevision(doc1);

    // Real content change: revision number updated
    const doc2 = { ...doc1, revision: '43', revision_date: '2024-02-20' };
    saveRevision(doc2);

    const revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(2); // Should create new revision
    expect(revisions[0].revision).toBe('43');
    expect(revisions[1].revision).toBe('42');
  });

  it('should create exactly 1 revision for model change', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    saveRevision(doc1);

    // Model name corrected
    const doc2 = { ...doc1, model: 'Model 172S' };
    saveRevision(doc2);

    const revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(2);
    expect(revisions[0].model).toBe('Model 172S');
    expect(revisions[0].field_changes).toHaveLength(1);
    expect(revisions[0].field_changes?.[0].field).toBe('model');
  });

  it('should hash consistently regardless of URL', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      holder: 'Cessna Aircraft',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    const doc2 = { ...doc1, url: 'https://different.com/path/file.pdf?cache=999' };

    const hash1 = hashTCDS(normalizeTCDS(doc1));
    const hash2 = hashTCDS(normalizeTCDS(doc2));

    expect(hash1).toBe(hash2); // Hashes must be identical
  });

  it('should detect field changes correctly', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'A00001SE',
      revision: '42',
      revision_date: '2024-01-15',
      model: 'Model 172',
      status: 'current',
      holder: 'Cessna Aircraft',
      url: 'https://example.com/tcds/A00001SE.pdf'
    };

    saveRevision(doc1);

    // Multiple field changes
    const doc2 = {
      ...doc1,
      revision: '43',
      revision_date: '2024-03-01',
      holder: 'Textron Aviation',
      url: 'https://new-url.com/file.pdf' // Should be ignored
    };
    saveRevision(doc2);

    const revisions = getRevisionsByTCDS('A00001SE');
    expect(revisions).toHaveLength(2);

    const changes = revisions[0].field_changes || [];
    expect(changes).toHaveLength(3); // revision, revision_date, holder
    expect(changes.find(c => c.field === 'url')).toBeUndefined(); // URL not tracked
  });
});
