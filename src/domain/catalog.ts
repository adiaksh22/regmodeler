import type { TCDSDocument } from '../types/tcds';

export interface CatalogDocument extends TCDSDocument {
  id?: string;
  authority: string;
  product_type: string | null;
  retrieved_at: string;
}

export type CatalogSource = 'database' | 'sample' | 'fallback';
export interface CatalogResult<T> {
  data: T;
  source: CatalogSource;
  notice?: string;
}
