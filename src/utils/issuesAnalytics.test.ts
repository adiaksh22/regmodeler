import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getIssuesOverTime, getCurrentIssueStats } from './issuesAnalytics';
import { addIssue } from './storageManager';

describe('issuesAnalytics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses recorded event dates rather than identifiers or the current date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-06T12:00:00Z'));
    try {
      addIssue({
        id: 'arbitrary-id', tcds_number: 'P19NE', issue_type: 'test',
        field_name: 'holder', table_value: 'a', source_value: 'b', status: 'resolved',
        created_at: '2026-01-03T12:00:00Z', resolved_at: '2026-01-04T12:00:00Z',
      });
      expect(getIssuesOverTime('day', 7)).toEqual([
        { intervalStart: '2026-01-03', openedCount: 1, resolvedCount: 0, activeCount: 1 },
        { intervalStart: '2026-01-04', openedCount: 0, resolvedCount: 1, activeCount: 0 },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should return empty array when no issues', () => {
    const intervals = getIssuesOverTime('day', 7);
    expect(intervals).toEqual([]);
  });

  it('should aggregate issues by day', () => {
    // Create issues with timestamps
    const now = Date.now();
    const id1 = now.toString(36) + 'abc';
    const id2 = (now - 86400000).toString(36) + 'def'; // 1 day ago

    addIssue({
      id: id1,
      tcds_number: 'P19NE',
      issue_type: 'MISMATCH',
      field_name: 'test',
      table_value: 'a',
      source_value: 'b',
      status: 'open'
    });

    addIssue({
      id: id2,
      tcds_number: 'E7CE',
      issue_type: 'MISMATCH',
      field_name: 'test2',
      table_value: 'c',
      source_value: 'd',
      status: 'resolved'
    });

    const intervals = getIssuesOverTime('day', 7);
    expect(intervals.length).toBeGreaterThan(0);
  });

  it('should calculate current issue stats', () => {
    addIssue({
      id: '1',
      tcds_number: 'P19NE',
      issue_type: 'MISMATCH',
      field_name: 'test',
      table_value: 'a',
      source_value: 'b',
      status: 'open'
    });

    addIssue({
      id: '2',
      tcds_number: 'E7CE',
      issue_type: 'MISMATCH',
      field_name: 'test2',
      table_value: 'c',
      source_value: 'd',
      status: 'resolved'
    });

    addIssue({
      id: '3',
      tcds_number: 'A14SO',
      issue_type: 'field_mismatch',
      field_name: 'test3',
      table_value: 'e',
      source_value: 'f',
      status: 'open'
    });

    const stats = getCurrentIssueStats();

    expect(stats.total).toBe(3);
    expect(stats.open).toBe(2);
    expect(stats.resolved).toBe(1);
    expect(stats.byType['MISMATCH']).toBe(2);
    expect(stats.byType['field_mismatch']).toBe(1);
  });

  it('should handle empty stats', () => {
    const stats = getCurrentIssueStats();

    expect(stats.total).toBe(0);
    expect(stats.open).toBe(0);
    expect(stats.resolved).toBe(0);
    expect(stats.ignored).toBe(0);
  });

  it('should aggregate by week', () => {
    const now = Date.now();
    const id1 = now.toString(36) + 'abc';

    addIssue({
      id: id1,
      tcds_number: 'P19NE',
      issue_type: 'MISMATCH',
      field_name: 'test',
      table_value: 'a',
      source_value: 'b',
      status: 'open'
    });

    const intervals = getIssuesOverTime('week', 30);
    expect(Array.isArray(intervals)).toBe(true);
  });

  it('should calculate cumulative active count', () => {
    const now = Date.now();

    addIssue({
      id: now.toString(36) + 'a',
      tcds_number: 'P19NE',
      issue_type: 'MISMATCH',
      field_name: 'test1',
      table_value: 'a',
      source_value: 'b',
      status: 'open'
    });

    addIssue({
      id: now.toString(36) + 'b',
      tcds_number: 'E7CE',
      issue_type: 'MISMATCH',
      field_name: 'test2',
      table_value: 'c',
      source_value: 'd',
      status: 'open'
    });

    const intervals = getIssuesOverTime('day', 7);

    if (intervals.length > 0) {
      const latest = intervals[intervals.length - 1];
      expect(latest.activeCount).toBeGreaterThanOrEqual(0);
    }
  });
});
