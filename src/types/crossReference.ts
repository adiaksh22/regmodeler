export type CrossRefMethod = 'manual' | 'auto';

export interface CrossRefGroup {
  group_id: string;
  members: string[];
  created_at: string;
  updated_at: string;
  method: CrossRefMethod;
  confidence?: number;
}
