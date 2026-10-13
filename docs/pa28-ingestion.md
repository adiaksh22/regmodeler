# First live import: Piper PA-28

Selected scope: FAA TCDS `2A13`, including the current and historical revisions returned by the authenticated API. This is the first part of step 3; AD/STC discovery, eCFR/CAR references, attachment downloads, scheduling, and the relationship graph remain subsequent work. The website stays unpublished.

## Source contract

The connector uses FAA's documented `POST /api/drs/data-pull/TCDSMODEL/filtered`, with `documentFilters` selecting `drs:documentNumber: ["2A13"]`, `sortOrder: ASC`, and offsets increasing by 750. The technical design document downloaded during feasibility review is version 6.0, August 7, 2025; its local copy is ignored evidence. It documents positive-result `docLastModifiedDate` filtering and the returned primary-file download URL.

Every import fully reconciles this small certificate catalog. It also checks positive-result incremental filtering using a one-day window before the latest source modification and compares that response with the full catalog. An empty or inconsistent catalog, ambiguous current revision, changing pagination total, duplicate record, or incomplete page fails the run.

The worker forwards the FAA key only to HTTPS `drs.faa.gov` API paths and refuses redirects. Requests time out and retry transient network/429/5xx failures up to three attempts. Responses and downloads have byte limits. Primary downloads must have a PDF signature. Additional attachments are explicitly marked pending; they are not counted as downloaded.

## Preservation and checkpoint behavior

Original primary PDFs and canonical metadata JSON are stored privately in `regulatory-sources`, addressed by SHA-256. Existing objects are checked against their bytes rather than overwritten. Metadata and PDF corrections produce distinct snapshots even when the FAA source GUID is unchanged. The first import can enrich the existing verified seed without breaking its evidence ID.

One service-only PostgreSQL function commits the entire version batch, updates the current-version pointer, marks the run successful, and advances its checkpoint in a transaction. A failed batch leaves the previous checkpoint and current pointer intact. Interrupted runs remain `running` rather than claiming success; objects archived before a failed batch may remain for a later retry. A successful newer run prevents an older concurrent run from replacing its results.

## Configuration and commands

For local development, keep the existing local Supabase URL/server key in ignored `.env.local` and set its existing `FAA_DRS_API_KEY=` value privately. Do not use any `VITE_` variable for this key.

```powershell
# Read FAA metadata and verify positive incremental filtering; no database writes.
npm.cmd run import:verify

# Apply pending migration to the existing local stack without resetting its data.
npx.cmd supabase db push --local

# Archive original files and commit the 2A13 batch to the configured local database.
npm.cmd run import:tcds

# Offline connector and transactional database checks.
npm.cmd run worker:test
npm.cmd run db:test
```

The import targets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, not the frontend's `.env.production.local`. Hosted ingestion requires separately configured hosted server credentials. Do not replace local development credentials to run a hosted job; use a separate ignored worker environment file or GitHub Actions secrets when the live source contract has passed.

GitHub has a manual **PA-28 TCDS import** workflow. Its default is verification only; importing requires explicitly turning off `verify_only` and configuring repository secrets `FAA_DRS_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SECRET_KEY`. Apply the importer migration to the hosted project before a hosted import. This workflow does not deploy the website.

No unattended schedule is enabled yet. First and repeated live imports are validated; the next scheduling requirement is repository Actions secrets and a successful manual hosted workflow run. Log messages contain only counts, certificate identity, timestamps, and controlled error codes; never raw client errors or credentials.

## Validation status

Verified October 13, 2026:

- FAA certificate filtering returned 23 revisions for `2A13`, with one current revision (66) and 22 historical revisions.
- Positive-result incremental filtering returned one record and matched the full-catalog result for that window.
- First and repeated imports succeeded in both local and hosted Supabase. Each catalog retains 23 revisions and 46 private archive objects totaling 15,027,177 bytes; repeated imports did not add duplicate revisions or files.
- Checkpoints reference successful runs; the source modification watermark is `2025-12-15T18:03:54.151Z`, distinct from the October 2026 retrieval/run dates.
- The hosted public API can read the current record and all 23 revisions. Anonymous source writes and file downloads were denied.
- Eight offline worker tests and PostgreSQL transaction/access checks passed. The importer migration is applied locally and in the hosted project.

`retrieved_at` preserves the first observation of an unchanged snapshot. Use the checkpoint's successful run for last-check freshness; repeated polling does not rewrite historical retrieval dates.

Primary PDFs and raw metadata are archived. Additional attachments, related AD/STC discovery, regulatory text ingestion, and graph evidence remain subsequent work. No unattended schedule or public website deployment has been enabled. Hosted server credentials were used only in memory and were not saved in frontend configuration or committed.
