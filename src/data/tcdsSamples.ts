import samples from './tcds-samples.json';
import type { TCDSDocument } from '../types/tcds';

export interface TCDSSample extends TCDSDocument {
  product_type: 'Aircraft' | 'Engine' | 'Propeller';
  retrieved_at: string;
}

// Snapshots from the feasibility review; this module performs no live ingestion.
export const tcdsSamples = samples as TCDSSample[];

export const getTcdsSample = (number: string): TCDSSample | null =>
  tcdsSamples.find(sample => sample.tcds_number === number.trim().toUpperCase()) ?? null;
