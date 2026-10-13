export interface TCDSRevision {
  id: string;
  tcds_number: string;
  timestamp: string;
  revision: string;
  revision_date: string;
  model: string;
  status: 'current' | 'historical';
  holder?: string;
  url: string;
  content_hash: string;
  content_length: number;
  field_changes?: FieldChange[];
}

export interface FieldChange {
  field: string;
  old_value: string | undefined;
  new_value: string | undefined;
}

export interface NormalizedTCDS {
  tcds_number: string;
  revision: string;
  revision_date: string;
  model: string;
  status: string;
  holder: string;
  url: string;
}
