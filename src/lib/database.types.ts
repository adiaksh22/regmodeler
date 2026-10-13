import type { OfficialRevision, EvidenceRelationship } from '../domain/explorer';
// Initial Data API contract. Regenerate from Supabase after schema changes.
export type TCDSCatalogRow = {
  id: string;
  authority: string;
  tcds_number: string;
  revision: string;
  revision_date: string | null;
  url: string;
  model: string;
  status: 'current' | 'historical';
  holder: string | null;
  product_type: string | null;
  retrieved_at: string;
};

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: {
      tcds_catalog: { Row: TCDSCatalogRow; Relationships: [] };
      tcds_versions: { Row: OfficialRevision; Relationships: [] };
      tcds_relationships: { Row: EvidenceRelationship; Relationships: [] };
    };
    Functions: {
      search_tcds: { Args: { search_query?: string; result_limit?: number }; Returns: TCDSCatalogRow[] };
      catalog_last_checked: { Args: { p_number: string }; Returns: string | null };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
