# Prototype browser storage

This is temporary, browser-local persistence. Shared authoritative data, source versions, and subscriptions will move to the database/API in step 2. Keys are retained so existing local prototype records remain accessible.

| Key | Shape | Current responsibility |
| --- | --- | --- |
| `tcds_documents` | `TCDSDocument[]` | Local snapshots used by storage utilities/tests; the detail page displays verified sample data instead |
| `tcds_revisions` | `Record<string, TCDSRevision[]>` | Locally recorded snapshots and metadata field changes |
| `tcds_cross_references` | `CrossRefGroup[]` | Personal links; no applicability or equality inference |
| `tcds_change_log_entries` | `TCDSChangeLogEntry[]` | Existing local change events displayed by the change-log page |
| `tcds_issues` | `Issue[]` | Existing prototype issues and explicit creation/resolution timestamps |

## Revision behavior

`saveDocument()` records a revision and updates the local current snapshot. `saveRevision()` normalizes metadata, excludes the URL from content comparison, and appends only when content changes. It uses a prototype FNV-1a hash plus serialized content length; the future ingestion service should use SHA-256 and archive original source content.

Reading revisions migrates the legacy flat-array format to the map format. Latest entries are displayed first; equal timestamps are ordered by insertion. Reading or reloading a verified FAA sample does not save a new revision or clear stored documents.

## Issue timelines

New issues receive `created_at` if it is absent. Resolving an issue records `resolved_at`; reopening it removes that resolution timestamp. Timelines use these explicit dates, with UTC daily/ISO-week grouping. Legacy entries without dates remain in current counts but do not establish historical dates.

This represents the most recent resolution, not a complete issue-status event history. The future database should retain event history when multiple transitions need to be audited.

## Archived keys

The previous page-driven monitor used `tcds_change_logs` and `tcds_entities`. Those records are not removed, but active code no longer produces or consumes them. The archived monitor must not be used for live regulatory updates.
