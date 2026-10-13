import { getIssues } from './storageManager';

export interface IssueInterval {
  intervalStart: string;
  openedCount: number;
  resolvedCount: number;
  activeCount: number;
}

export type IntervalType = 'day' | 'week';

const getIntervalKey = (date: Date, type: IntervalType): string => {
  if (type === 'day') {
    return date.toISOString().split('T')[0];
  }
  // Week: ISO week format (YYYY-Www)
  const weekDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  weekDate.setUTCDate(weekDate.getUTCDate() + 4 - (weekDate.getUTCDay() || 7));
  const year = weekDate.getUTCFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const getIssuesOverTime = (intervalType: IntervalType = 'day', days: number = 30): IssueInterval[] => {
  const issues = getIssues();

  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const intervals = new Map<string, { opened: number; resolved: number }>();

  let cumulativeActive = 0;

  // Count issues by creation/resolution time
  for (const issue of issues) {
    // Retain legacy records, but never infer event dates from their identifiers.
    const createdDate = new Date(issue.created_at ?? '');
    if (!isNaN(createdDate.getTime()) && createdDate <= now) {
      if (createdDate < cutoff) cumulativeActive++;
      else {
        const key = getIntervalKey(createdDate, intervalType);
        if (!intervals.has(key)) {
          intervals.set(key, { opened: 0, resolved: 0 });
        }
        intervals.get(key)!.opened++;
      }
    }

    // Count resolved issues
    const resolvedDate = new Date(issue.resolved_at ?? '');
    if (issue.status === 'resolved' && !isNaN(resolvedDate.getTime()) && resolvedDate <= now) {
      if (resolvedDate < cutoff) cumulativeActive--;
      else {
        const key = getIntervalKey(resolvedDate, intervalType);
        if (!intervals.has(key)) {
          intervals.set(key, { opened: 0, resolved: 0 });
        }
        intervals.get(key)!.resolved++;
      }
    }
  }

  // Calculate active count (cumulative)
  const sortedKeys = Array.from(intervals.keys()).sort();

  const result: IssueInterval[] = sortedKeys.map(key => {
    const data = intervals.get(key)!;
    cumulativeActive += data.opened - data.resolved;

    return {
      intervalStart: key,
      openedCount: data.opened,
      resolvedCount: data.resolved,
      activeCount: Math.max(0, cumulativeActive)
    };
  });

  return result;
};

export const getCurrentIssueStats = () => {
  const issues = getIssues();

  return {
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    ignored: issues.filter(i => i.status === 'ignored').length,
    byType: issues.reduce((acc, issue) => {
      acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
};
