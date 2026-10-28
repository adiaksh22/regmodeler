# Source monitoring audit — October 28, 2026

The daily and weekly GitHub workflows are active, with `SOURCE_CHECKS_ENABLED=true`. Recent scheduled runs failed on PA-28 STC tuple validation. The daily job continued through the Boeing checks; the weekly job previously stopped at its first failing source. Weekly source steps now continue independently while preserving the job's failure result.

## Repairs completed

- Delta-query failures occurring before a full importer starts now create a sanitized failed-attempt record. Successful unchanged checks retain their existing single zero-record heartbeat; failed attempts do not advance checkpoints.
- Generic TCDS commits now record source observations atomically with the import. Previously, this path updated the catalog without maintaining the change-feed baseline. Existing archived Boeing versions established the missing baseline without generating retrospective change events or making FAA requests.
- Public monitoring uses the successful run's completion time, rather than checkpoint-maintenance time. It exposes no internal error messages or credentials.
- All six sources have distinct family/type labels. Failed, overdue (36 hours), unconfirmed, baseline-pending and interrupted (over one hour running) checks are visible. These are operational thresholds, not regulatory deadlines.
- Feed filters include the two PA-28 models and six approved Boeing variants in the monitored scope. Boeing event links lead to A16WE; Piper links lead to 2A13. Unmapped non-TCDS model links are omitted rather than guessed.
- Aircraft detail exposes the same family-scoped health and monitoring limits without another initial API call. A collapsed health panel flags checks needing attention.
- Revision history no longer cancels its own request when its loading state changes.

## Remaining source condition: PA-28 STCs

The bounded FAA query returned 857 records. Eight returned records fail exact certificate/model tuple association. Multiple source observations share some displayed numbers. Observed examples:

| FAA displayed STC number | Returned tuple association for a supported model |
| --- | --- |
| SA01026SE | PA-28-140 paired with 1A2 |
| SA02154AK | PA-28-181 paired with A15EU; PA-28-140 paired with 2A4 |
| SA4005NM (Page 1) | PA-28-140 paired with A10WE |
| SA01435SE | PA-28-140/-181 paired with 3A23 |
| SA593CH (Page 1) | PA-28-140/-181 paired with 1A2 |

These observations do not establish actual approval scope. The independent FAA certificate and model filters can return records that fail the tool's required 2A13/model association. The importer continues to fail closed with `OUT_OF_SCOPE_RELATED_RECORD`; it neither pairs independent arrays to infer applicability nor silently drops records from an allegedly complete reconciliation. The last successful PA-28 STC check remains October 23. Public health now exposes that failure and warns that later changes may be missing.

A future quarantine design can preserve rejected query observations, their exact identities and reasons separately from accepted model matches, with explicit coverage accounting. It must distinguish “returned but scope unconfirmed” from “missing from index,” and suspend affected old paths without manufacturing withdrawal or approval claims. Exact originals/AMLs or authoritative metadata correction are needed before assigning disputed model scope. This audit does not implement that pipeline or approve these records.

## Revision alignment and monitoring limits

Hosted A16WE catalog Revision 82 is already imported. Its variant facts and MAX 10 boundary remain reviewed against Revision 81 and are labeled as earlier evidence. Tests verify that replacing the current TCDS suspends its old TCDS graph paths, leaves independently current AD/STC evidence separate, and does not automatically refresh reviewed variant facts. A page-level Revision 82 evidence review remains necessary.

Daily checks inspect metadata modification windows with one day of overlap. Unchanged TCDS metadata does not trigger fresh PDF downloads. Weekly full reconciliation verifies the bounded TCDS originals and covers undated related records/removals. Automatic AD/STC PDF/attachment byte monitoring is not implemented; no promise of detecting silent content changes is made.

## Verification

Local checks passed: 93 frontend tests, 38 worker tests, embedded database migration/access/integrity checks, lint, types and production build. Database regressions cover baseline repair without historical events, canonical model names in new TCDS events, failed-attempt success timestamps and old-graph suspension. A bounded hosted A16WE check returned two overlap records with no reconciliation; the PA-28 STC check reproduced the scope failure and recorded it. Browser checks passed named sources, failure visibility, Boeing filters/links, completed lazy history and mobile layout. The website remains unpublished.
