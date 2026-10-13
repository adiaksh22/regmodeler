import { listGroups } from './crossReferenceManager';
import { getDocuments } from './documentManager';
import { normalizeTCDS } from './revisionManager';
import { addIssue, getIssues, updateIssueStatus } from './storageManager';
import { NormalizedTCDS } from '../types/revision';

// Fields to ignore in mismatch detection (same as diff ignore list)
const MISMATCH_IGNORE_FIELDS: Set<keyof NormalizedTCDS> = new Set([
  'url',
  'tcds_number',
]);

// Severity mapping for different fields
const FIELD_SEVERITY: Record<string, 'Critical' | 'High' | 'Medium' | 'Low'> = {
  status: 'High',
  revision: 'High',
  revision_date: 'High',
  holder: 'Medium',
  model: 'Medium',
};

export const detectMismatches = (): void => {
  const groups = listGroups();
  const documents = getDocuments();
  const existingIssues = getIssues();
  
  const docMap = new Map(documents.map(d => [d.tcds_number, d]));
  const activeIssueKeys = new Set<string>();
  
  for (const group of groups) {
    const normalizedDocs: Array<{ tcds: string; normalized: NormalizedTCDS }> = [];
    
    // Normalize all members
    for (const member of group.members) {
      const doc = docMap.get(member);
      if (doc) {
        normalizedDocs.push({
          tcds: member,
          normalized: normalizeTCDS(doc)
        });
      }
    }
    
    if (normalizedDocs.length < 2) continue;
    
    // Compare all fields across members
    const fields = Object.keys(normalizedDocs[0].normalized) as (keyof NormalizedTCDS)[];
    
    for (const field of fields) {
      if (MISMATCH_IGNORE_FIELDS.has(field)) continue;
      
      const values = normalizedDocs.map(d => d.normalized[field]);
      const uniqueValues = new Set(values);
      
      if (uniqueValues.size > 1) {
        // Mismatch detected
        const issueKey = `group:${group.group_id}:field:${field}`;
        activeIssueKeys.add(issueKey);
        
        const existing = existingIssues.find(i => 
          i.issue_type === 'MISMATCH' && 
          i.field_name === issueKey
        );
        
        if (!existing) {
          // Create new issue
          const valuesList = normalizedDocs
            .map(d => `${d.tcds}: "${d.normalized[field]}"`)
            .join(', ');
          
          addIssue({
            id: crypto.randomUUID(),
            tcds_number: group.members[0],
            issue_type: 'MISMATCH',
            field_name: issueKey,
            table_value: valuesList,
            source_value: `Group ${group.group_id} has mismatched ${field}`,
            status: 'open'
          });
        }
      }
    }
  }
  
  // Resolve issues that no longer have mismatches
  for (const issue of existingIssues) {
    if (issue.issue_type === 'MISMATCH' && issue.status === 'open') {
      if (!activeIssueKeys.has(issue.field_name)) {
        updateIssueStatus(issue.id, 'resolved');
      }
    }
  }
};

export const getMismatchSeverity = (fieldName: string): 'Critical' | 'High' | 'Medium' | 'Low' => {
  const field = fieldName.split(':').pop() || '';
  return FIELD_SEVERITY[field] || 'Low';
};
