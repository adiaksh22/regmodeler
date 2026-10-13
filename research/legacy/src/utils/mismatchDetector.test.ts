import { describe, it, expect, beforeEach } from 'vitest';
import { detectMismatches, getMismatchSeverity } from './mismatchDetector';
import { createGroup } from './crossReferenceManager';
import { saveDocument } from './documentManager';
import { getIssues } from './storageManager';
import { TCDSDocument } from '../types/tcds';

describe('mismatchDetector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should detect no mismatches when fields match', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    const doc2: TCDSDocument = {
      ...doc1,
      tcds_number: 'E7CE',
      url: 'https://different.com' // URL should be ignored
    };

    saveDocument(doc1);
    saveDocument(doc2);
    createGroup(['P19NE', 'E7CE']);

    detectMismatches();

    const issues = getIssues();
    expect(issues.filter(i => i.issue_type === 'MISMATCH')).toHaveLength(0);
  });

  it('should detect mismatch when revision differs', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    const doc2: TCDSDocument = {
      ...doc1,
      tcds_number: 'E7CE',
      revision: '9' // Different revision
    };

    saveDocument(doc1);
    saveDocument(doc2);
    createGroup(['P19NE', 'E7CE']);

    detectMismatches();

    const issues = getIssues();
    const mismatchIssues = issues.filter(i => i.issue_type === 'MISMATCH');
    expect(mismatchIssues.length).toBeGreaterThan(0);
    expect(mismatchIssues[0].field_name).toContain('revision');
  });

  it('should detect multiple field mismatches', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    const doc2: TCDSDocument = {
      ...doc1,
      tcds_number: 'E7CE',
      revision: '9',
      model: 'MTV-7-( )',
      holder: 'Different Holder'
    };

    saveDocument(doc1);
    saveDocument(doc2);
    createGroup(['P19NE', 'E7CE']);

    detectMismatches();

    const issues = getIssues();
    const mismatchIssues = issues.filter(i => i.issue_type === 'MISMATCH');
    expect(mismatchIssues.length).toBeGreaterThanOrEqual(3);
  });

  it('should ignore URL differences', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://url1.com'
    };

    const doc2: TCDSDocument = {
      ...doc1,
      tcds_number: 'E7CE',
      url: 'https://url2.com'
    };

    saveDocument(doc1);
    saveDocument(doc2);
    createGroup(['P19NE', 'E7CE']);

    detectMismatches();

    const issues = getIssues();
    const urlIssues = issues.filter(i => i.field_name.includes('url'));
    expect(urlIssues).toHaveLength(0);
  });

  it('should resolve issues when mismatches are fixed', () => {
    const doc1: TCDSDocument = {
      tcds_number: 'P19NE',
      revision: '8',
      revision_date: '07/08/2021',
      model: 'MTV-6-( )',
      status: 'current',
      holder: 'MT-Propeller',
      url: 'https://example.com'
    };

    const doc2: TCDSDocument = {
      ...doc1,
      tcds_number: 'E7CE',
      revision: '9'
    };

    saveDocument(doc1);
    saveDocument(doc2);
    createGroup(['P19NE', 'E7CE']);

    detectMismatches();
    let issues = getIssues();
    expect(issues.filter(i => i.issue_type === 'MISMATCH' && i.status === 'open').length).toBeGreaterThan(0);

    // Fix the mismatch
    saveDocument({ ...doc2, revision: '8' });
    detectMismatches();

    issues = getIssues();
    expect(issues.filter(i => i.issue_type === 'MISMATCH' && i.status === 'open')).toHaveLength(0);
  });

  it('should return correct severity for fields', () => {
    expect(getMismatchSeverity('group:123:field:status')).toBe('High');
    expect(getMismatchSeverity('group:123:field:revision')).toBe('High');
    expect(getMismatchSeverity('group:123:field:holder')).toBe('Medium');
    expect(getMismatchSeverity('group:123:field:model')).toBe('Medium');
    expect(getMismatchSeverity('group:123:field:other')).toBe('Low');
  });

  it('should handle groups with missing documents', () => {
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
    createGroup(['P19NE', 'NONEXISTENT']);

    // Should not throw
    expect(() => detectMismatches()).not.toThrow();
  });
});
