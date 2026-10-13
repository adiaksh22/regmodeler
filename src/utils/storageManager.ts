import { TCDSChangeLogEntry, Issue } from '../types/tcds';

const CHANGE_LOG_KEY = 'tcds_change_log_entries';
const ISSUES_KEY = 'tcds_issues';

export const getChangeLogEntries = (): TCDSChangeLogEntry[] => {
  const data = localStorage.getItem(CHANGE_LOG_KEY);
  return data ? JSON.parse(data) : [];
};

export const addChangeLogEntry = (entry: TCDSChangeLogEntry): void => {
  const entries = getChangeLogEntries();
  entries.push(entry);
  localStorage.setItem(CHANGE_LOG_KEY, JSON.stringify(entries));
};

export const getIssues = (): Issue[] => {
  const data = localStorage.getItem(ISSUES_KEY);
  return data ? JSON.parse(data) : [];
};

export const addIssue = (issue: Issue): void => {
  const issues = getIssues();
  issues.push({ ...issue, created_at: issue.created_at ?? new Date().toISOString() });
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
};

export const updateIssueStatus = (id: string, status: Issue['status']): void => {
  const issues = getIssues();
  const index = issues.findIndex(i => i.id === id);
  if (index !== -1) {
    issues[index].status = status;
    if (status === 'resolved') {
      issues[index].resolved_at ??= new Date().toISOString();
    } else {
      delete issues[index].resolved_at;
    }
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  }
};
