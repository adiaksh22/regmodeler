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
  original_source_url?: string | null;
};
export type VariantFact = {
  numeric_value: number | string | null; text_value: string | null; unit: string | null;
  conditions: Record<string,string>; evidence_page: number; evidence_excerpt: string;
};
export type AircraftVariantSummary = {
  entity_id: string; family_entity_id: string; tcds_document_id: string; tcds_number: string; model_key: string;
  display_name: string; market_name: string; faa_status: 'faa_approved'|'not_listed_in_current_tcds';
  approved_on: string | null; evidence_version_id: string; evidence_page: number; evidence_excerpt: string;
  facts: Record<string,VariantFact>;
  evidence_revision?:string;evidence_is_current?:boolean;
};
export type ApplicabilityRule = {
  relationship_id: string; rule_set_label: string; outcome: string; group_id: string; group_order: number;
  match_operator: 'all'|'any'; group_label: string; predicate_id: string; predicate_order: number;
  subject_kind: string; subject_key: string; comparison: string; expected: unknown;
  evidence_page: number; evidence_excerpt: string;
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
  review_status?:string;quality_flags?:string[];
};
export type ExplorerDetails = {
  revisions: OfficialRevision[]; relationships: EvidenceRelationship[]; lastChecked: string | null;
  available: boolean; notice?: string;
  sourceMaterials?: RegulationSource[];
  variants?: AircraftVariantSummary[];
  applicabilityRules?: ApplicabilityRule[];
};
