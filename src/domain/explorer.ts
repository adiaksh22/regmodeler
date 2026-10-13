export type OfficialRevision = {
  id: string; document_id: string; tcds_number: string; revision: string;
  revision_date: string | null; status: string; source_url: string; retrieved_at: string;
  content_sha256: string | null; is_current: boolean;
};
export type EvidenceRelationship = {
  id: string; tcds_number: string; model: string; target: string; target_type: string;
  relationship_type: string; evidence_page: number; evidence_excerpt: string;
  applicability_conditions: Record<string,string>; evidence_revision: string; source_url: string;
};
export type ExplorerDetails = {
  revisions: OfficialRevision[]; relationships: EvidenceRelationship[]; lastChecked: string | null;
  available: boolean; notice?: string;
};
