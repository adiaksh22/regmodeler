# LocalStorage Schema Documentation

## Storage Keys

### Existing Keys (Unchanged)
- `tcds_documents` - Current snapshot of each TCDS document
  - Type: `TCDSDocument[]`
  - Updated by: `saveDocument()` in `documentManager.ts`
  - Used by: `TCDSDetail.tsx`, `HomePage.tsx`

- `tcds_change_log_entries` - High-level change events
  - Type: `TCDSChangeLogEntry[]`
  - Updated by: `addChangeLogEntry()` in `storageManager.ts`
  - Used by: `ChangeLogPage.tsx`

- `tcds_issues` - Tracked issues/discrepancies
  - Type: `Issue[]`
  - Updated by: `addIssue()`, `updateIssueStatus()` in `storageManager.ts`
  - Used by: `ChangeLogPage.tsx`, `IssuesTable.tsx`

### New Key (Added)
- `tcds_revisions` - Complete revision history with field-level diffs
  - Type: `Record<string, TCDSRevision[]>` (map keyed by tcds_number)
  - Format: `{ "P19NE": [rev1, rev2, ...], "E7CE": [rev1, ...] }`
  - Updated by: `saveRevision()` in `revisionManager.ts`
  - Used by: `TCDSDetail.tsx` (via `getRevisionsByTCDS()`)
  - Migration: Automatically converts old flat array format to map on first read

## Data Flow

```
User searches TCDS
    ↓
loadDocument() called
    ↓
saveDocument() called
    ↓
├─→ saveRevision() [NEW]
│   ├─→ Normalize document
│   ├─→ Hash normalized content + calculate length
│   ├─→ Compare to previous revision (hash + length)
│   └─→ If changed: append to tcds_revisions[tcds_number]
│
└─→ Update tcds_documents (current snapshot)
```

## Diff Logic

### Ignored Fields (DIFF_IGNORE_FIELDS)
These fields are excluded from diff comparison:
- `url` - Reference field, not content
- `tcds_number` - Identifier, never changes

To add more ignored fields (e.g., `fetchedAt`, `lastSeen`, `ingestedAt`):
```typescript
const DIFF_IGNORE_FIELDS: Set<keyof NormalizedTCDS> = new Set([
  'url',
  'tcds_number',
  'fetchedAt',    // Add new fields here
  'lastSeen',
  'ingestedAt',
]);
```

### Diffed Fields (Automatic)
All other fields in `NormalizedTCDS` are automatically diffed:
- `revision`
- `revision_date`
- `model`
- `status`
- `holder`
- Any future fields added to `NormalizedTCDS`

## Storage Format Examples

### tcds_revisions (New Map Format)
```json
{
  "P19NE": [
    {
      "id": "abc123",
      "tcds_number": "P19NE",
      "timestamp": "2024-01-15T10:30:00Z",
      "revision": "9",
      "revision_date": "12/15/2024",
      "model": "MTV-6-( )",
      "status": "current",
      "holder": "MT-Propeller GmbH",
      "url": "https://...",
      "content_hash": "a1b2c3d4",
      "content_length": 156,
      "field_changes": [
        {"field": "revision", "old_value": "8", "new_value": "9"},
        {"field": "holder", "old_value": "MT-Propeller", "new_value": "MT-Propeller GmbH"}
      ]
    },
    {
      "id": "def456",
      "tcds_number": "P19NE",
      "timestamp": "2024-01-01T08:00:00Z",
      "revision": "8",
      "...": "..."
    }
  ],
  "E7CE": [...]
}
```

## Backward Compatibility

✅ All existing functionality preserved:
- `tcds_documents` still maintains current state
- `tcds_change_log_entries` still tracks changes
- `tcds_issues` still tracks issues
- ChangeLogPage and IssuesTable unchanged

✅ New functionality added:
- `tcds_revisions` provides detailed history (O(1) lookup by tcds_number)
- Field-level diffs available
- No phantom revisions (deterministic hashing + length check)
- Extensible diff logic (easy to add new fields)

## Migration

Automatic migration on first read:
- Old format (flat array): `[{tcds_number: "P19NE", ...}, ...]`
- New format (map): `{"P19NE": [...], "E7CE": [...]}`
- Migration happens transparently in `getRevisionsMap()`
- Migrated data is saved back to localStorage
