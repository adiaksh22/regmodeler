export type OfficialRevision = {
  id: string; document_id: string; tcds_number: string; revision: string;
  revision_date: string | null; status: string; source_url: string; retrieved_at: string;
  content_sha256: string | null; is_current: boolean;
};
export type EvidenceRelationship = {
  id: string; tcds_number: string; model: string; target: string; target_type: string;
  relationship_type: string; evidence_page: number; evidence_excerpt: string;
  applicability_conditions: Record<string,string>; evidence_revision: string; source_url: string;
  source_document_number?: string; source_document_type?: string; basis_key?: string;
  path_via?: string | null; direction?: string; evidence_version_id?: string;
  source_entity_id?: string; target_entity_id?: string; model_entity_id?: string; via_entity_id?: string | null;
  evidence_attachment_id?: string | null; evidence_file_name?: string | null;
};
export type RegulationSource = {
  id: string; basis_key: string; section: string | null; title: string; edition_date: string;
  source_kind: string; body_text: string | null; text_quality: string | null; source_url: string;
  retrieved_at: string; contains_graphics: boolean;
};
export type RelatedDocument = {
  id: string; model: string; document_type: string; document_number: string; title: string;
  status: string; is_active: boolean; source_url: string; retrieved_at: string;
  effective_date: string | null; holder: string | null; summary: string | null; regulatory_text?: string | null;
  candidate_reason: string; supersedes: string[] | null; superseded_by: string[] | null;
  original_archived: boolean; attachments_pending: boolean;
};
export type ExplorerDetails = {
  revisions: OfficialRevision[]; relationships: EvidenceRelationship[]; lastChecked: string | null;
  available: boolean; notice?: string;
  sourceMaterials?: RegulationSource[];
};
