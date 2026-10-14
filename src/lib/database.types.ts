import type { OfficialRevision, EvidenceRelationship, RelatedDocument, RegulationSource } from '../domain/explorer';
import type {SourceChange,SourceMonitoring} from '../domain/sourceChanges';
import type {ReviewQueueRow} from './relatedCatalog';
// Public read contract. Keep view columns and RPC signatures in sync with migrations.
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
    Tables: Record<never, never>;
    Views: {
      tcds_catalog: { Row: TCDSCatalogRow; Relationships: [] };
      tcds_versions: { Row: OfficialRevision; Relationships: [] };
      tcds_relationships: { Row: EvidenceRelationship; Relationships: [] };
      model_graph: { Row: EvidenceRelationship; Relationships: [] };
      source_review_queue: {Row:ReviewQueueRow;Relationships:[]};
      related_documents: { Row: RelatedDocument & {regulatory_text: string | null}; Relationships: [] };
      regulation_sources: { Row: RegulationSource; Relationships: [] };
      source_change_feed:{Row:SourceChange;Relationships:[]};
    };
    Functions: {
      search_tcds: { Args: { search_query?: string; result_limit?: number }; Returns: TCDSCatalogRow[] };
      catalog_last_checked: { Args: { p_number: string }; Returns: string | null };
      related_last_checked: { Args: { p_model: string }; Returns: {document_type:string;last_checked:string}[] };
      source_monitoring:{Args:Record<never,never>;Returns:SourceMonitoring[]};
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
