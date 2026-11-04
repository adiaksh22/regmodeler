import { TCDSChangeLogEntry, Issue } from '../types/tcds';
import {readBrowserRecord,writeBrowserRecord,recordObject,stringFields} from '../lib/browserRecords';

const CHANGE_LOG_KEY = 'tcds_change_log_entries';
const ISSUES_KEY = 'tcds_issues';
const validEntries=(value:unknown)=>Array.isArray(value)&&value.every(entry=>stringFields(entry,['id','tcds_number','detected_at','change_type','summary','old_hash','new_hash']));
const validIssues=(value:unknown)=>Array.isArray(value)&&value.every(issue=>recordObject(issue)&&stringFields(issue,['id','tcds_number','issue_type','field_name','table_value','source_value'])&&['open','resolved','ignored'].includes(String(issue.status))&&['created_at','resolved_at'].every(field=>issue[field]===undefined||(typeof issue[field]==='string'&&Number.isFinite(Date.parse(issue[field])))));

export const getChangeLogEntries = (): TCDSChangeLogEntry[] => {
  return readBrowserRecord<TCDSChangeLogEntry[]>(CHANGE_LOG_KEY,[],validEntries);
};

export const addChangeLogEntry = (entry: TCDSChangeLogEntry): void => {
  const entries = getChangeLogEntries();
  entries.push(entry);
  writeBrowserRecord(CHANGE_LOG_KEY,entries,validEntries);
};

export const getIssues = (): Issue[] => {
  return readBrowserRecord<Issue[]>(ISSUES_KEY,[],validIssues);
};

export const addIssue = (issue: Issue): void => {
  const issues = getIssues();
  issues.push({ ...issue, created_at: issue.created_at ?? new Date().toISOString() });
  writeBrowserRecord(ISSUES_KEY,issues,validIssues);
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
    writeBrowserRecord(ISSUES_KEY,issues,validIssues);
  }
};
