export interface TCDSChangeLog {
  id: string;
  tcds_id: string;
  source_url: string;
  last_checked_at: string;
  content_hash: string;
  last_revision_seen: string;
  last_revision_seen_date: string;
  changes?: string[];
}

export interface TCDSExtractedData {
  revision_number: string;
  revision_date: string;
  holder: string;
  status: string;
}

export type ChangeType = 'revision_updated' | 'content_changed_same_revision' | 'metadata_mismatch';

export interface TCDSChangeLogEntry {
  id: string;
  tcds_number: string;
  detected_at: string;
  change_type: ChangeType;
  summary: string;
  old_hash: string;
  new_hash: string;
}

export type IssueStatus = 'open' | 'resolved' | 'ignored';

export interface Issue {
  id: string;
  tcds_number: string;
  issue_type: string;
  field_name: string;
  table_value: string;
  source_value: string;
  status: IssueStatus;
  created_at?: string;
  resolved_at?: string;
}

export interface TCDSEntity {
  id: string;
  tcds_number: string;
  entity_type: 'requirement' | 'system' | 'hazard' | 'test_method' | 'compliance_evidence';
  content: string;
  version: string;
  date: string;
  section?: string;
}

export interface TCDSDocument {
  tcds_number: string;
  revision: string;
  revision_date: string;
  url: string;
  model: string;
  status: 'current' | 'historical';
  holder?: string;
}
