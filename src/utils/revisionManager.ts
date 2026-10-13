import { TCDSDocument } from '../types/tcds';
import { TCDSRevision, FieldChange, NormalizedTCDS } from '../types/revision';

const REVISIONS_KEY = 'tcds_revisions';

// FNV-1a hash (32-bit) - deterministic, fast, browser-safe
// Note: Not cryptographic, small collision risk acceptable for this use case
const fnv1aHash = (str: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

// Recursively sort object keys for stable serialization
const sortKeys = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);

  const sorted: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortKeys(record[key]);
  });
  return sorted;
};

// Migration: Convert old flat array format to new map format
const migrateRevisionsFormat = (data: TCDSRevision[] | Record<string, TCDSRevision[]>): Record<string, TCDSRevision[]> => {
  if (Array.isArray(data)) {
    // Old format: flat array
    const map: Record<string, TCDSRevision[]> = {};
    data.forEach((rev: TCDSRevision) => {
      if (!map[rev.tcds_number]) {
        map[rev.tcds_number] = [];
      }
      map[rev.tcds_number].push(rev);
    });
    // Save migrated format
    localStorage.setItem(REVISIONS_KEY, JSON.stringify(map));
    return map;
  }
  // Already in new format
  return data;
};

export const normalizeTCDS = (doc: TCDSDocument): NormalizedTCDS => {
  return {
    tcds_number: doc.tcds_number.toUpperCase().trim(),
    revision: doc.revision.trim(),
    revision_date: doc.revision_date.trim(),
    model: doc.model.trim(),
    status: doc.status.toLowerCase().trim(),
    holder: (doc.holder || '').trim(),
    url: doc.url.trim()
  };
};

export const hashTCDS = (normalized: NormalizedTCDS): string => {
  // Exclude volatile fields from hash computation
  const forHash: Partial<NormalizedTCDS> = { ...normalized };
  HASH_IGNORE_FIELDS.forEach(field => delete forHash[field]);

  const sorted = sortKeys(forHash);
  const str = JSON.stringify(sorted);
  return fnv1aHash(str);
};

export const getContentLength = (normalized: NormalizedTCDS): number => {
  // Exclude volatile fields from length computation
  const forHash: Partial<NormalizedTCDS> = { ...normalized };
  HASH_IGNORE_FIELDS.forEach(field => delete forHash[field]);

  const sorted = sortKeys(forHash);
  return JSON.stringify(sorted).length;
};

// Fields to exclude from hash computation (volatile/metadata fields)
const HASH_IGNORE_FIELDS: Set<keyof NormalizedTCDS> = new Set([
  'url',  // Volatile: can have cache-busting params, redirects, etc.
]);

// Fields to exclude from diff comparison (volatile/metadata fields)
const DIFF_IGNORE_FIELDS: Set<keyof NormalizedTCDS> = new Set([
  'url',           // Reference field, not content
  'tcds_number',   // Identifier, never changes
]);

export const diffFields = (oldDoc: NormalizedTCDS | null, newDoc: NormalizedTCDS): FieldChange[] => {
  if (!oldDoc) return [];

  const changes: FieldChange[] = [];

  // Diff all fields except those in ignore list
  const allFields = Object.keys(newDoc) as (keyof NormalizedTCDS)[];

  for (const field of allFields) {
    if (DIFF_IGNORE_FIELDS.has(field)) continue;

    // Normalize to empty string for consistent comparison
    const oldVal = (oldDoc[field] || '').trim();
    const newVal = (newDoc[field] || '').trim();

    // Only record change if normalized values differ
    if (oldVal !== newVal) {
      changes.push({
        field,
        old_value: oldVal || undefined,
        new_value: newVal || undefined
      });
    }
  }

  return changes;
};

const getRevisionsMap = (): Record<string, TCDSRevision[]> => {
  const data = localStorage.getItem(REVISIONS_KEY);
  if (!data) return {};

  const parsed = JSON.parse(data) as TCDSRevision[] | Record<string, TCDSRevision[]>;
  return migrateRevisionsFormat(parsed);
};

export const getRevisionsByTCDS = (tcdsNumber: string): TCDSRevision[] => {
  const map = getRevisionsMap();
  const revisions = map[tcdsNumber.trim().toUpperCase()] || [];
  // New entries are appended. Reverse first so ties retain insertion order.
  return [...revisions].reverse().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const saveRevision = (doc: TCDSDocument): void => {
  const normalized = normalizeTCDS(doc);
  const hash = hashTCDS(normalized);
  const contentLength = getContentLength(normalized);

  const map = getRevisionsMap();
  const existing = map[normalized.tcds_number] || [];
  const sorted = [...existing].reverse().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latest = sorted[0];

  // Skip if both hash and content length match - no actual change
  if (latest && latest.content_hash === hash && latest.content_length === contentLength) {
    return;
  }

  const oldNormalized = latest ? {
    tcds_number: latest.tcds_number,
    revision: latest.revision,
    revision_date: latest.revision_date,
    model: latest.model,
    status: latest.status,
    holder: latest.holder || '',
    url: latest.url
  } : null;

  const changes = diffFields(oldNormalized, normalized);

  const newRevision: TCDSRevision = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    tcds_number: normalized.tcds_number,
    timestamp: new Date().toISOString(),
    revision: normalized.revision,
    revision_date: normalized.revision_date,
    model: normalized.model,
    status: doc.status,
    holder: normalized.holder || undefined,
    url: normalized.url,
    content_hash: hash,
    content_length: contentLength,
    field_changes: changes.length > 0 ? changes : undefined
  };

  if (!map[normalized.tcds_number]) {
    map[normalized.tcds_number] = [];
  }
  map[normalized.tcds_number].push(newRevision);

  localStorage.setItem(REVISIONS_KEY, JSON.stringify(map));
};
