# Implementation plan

## Product scope

Primary users: aircraft owners and maintenance professionals. Initial coverage: FAA general aviation, starting with a small reviewed catalog of aircraft families. Commercial airplanes, other aircraft categories, engines, propellers, appliances, and additional authorities must fit the future domain model without replacing its fundamentals.

The published product will support source-linked search, aircraft profiles, regulatory relationship exploration, revision comparisons, and aircraft/configuration watchlists. It will distinguish certification-basis amendments from current regulations and distinguish potential relevance from confirmed applicability.

## Execution steps

| Step | Deliverable | Completion gate |
| --- | --- | --- |
| 1. Foundation and cleanup | Active/archived code separation, verified sample data, documented setup, repeatable quality checks | Lint, tests, typecheck, production build, and browser smoke checks pass |
| 2. Shared infrastructure | PostgreSQL schema and migrations, API, ingestion worker, environment configuration | Services start locally; configuration boundaries and database migration checks pass |
| 3. Verified ingestion | FAA TCDS/AD/STC and eCFR connectors, archived sources, version history, scheduled jobs | Reviewed records have citations; pagination and positive-result incremental retrieval pass |
| 4. Relationships | Canonical product/model identities and typed, directed, evidenced relationships | Representative aircraft/configuration connections are reviewed |
| 5. Search and aircraft interface | Search, aircraft profiles, source reader, filters, revision comparison | Owners and maintenance users can retrieve representative information with evidence |
| 6. Graph explorer | Expandable graph, relationship labels, source panel, filters, historical views | A user can follow and explain a model-to-regulation path |
| 7. Watchlists and alerts | Accounts, configuration-aware subscriptions, change relevance, notifications | Scheduled jobs detect changes without browser activity and avoid duplicate delivery |
| 8. Public beta | Hosting, backups, monitoring, accessibility, supported-catalog audit | Coverage and freshness are visible; operating and recovery procedures are tested |

## Chosen service boundaries

The user selected a $0 portfolio target: Cloudflare Pages, Supabase Free, and GitHub Actions. Keep the frontend at the repository root for simple Pages builds. Supabase supplies the database API through access-controlled views/RPCs, so a separate paid API server is not needed initially. `apps/worker` contains server-only jobs, `supabase/migrations` contains schema changes, and `src/domain` contains the initial frontend domain contract. GitHub Actions will run scheduled imports after step 3 validation. See [setup instructions](free-stack-setup.md).

Use PostgreSQL for canonical records, document versions, search, and relationship edges. Use object storage for original PDF/XML files. Start with relational queries for graph traversal; evaluate a separate graph database only when measured workloads require it.

The model must retain regulatory authority, stable product/certificate identity, revision/effective dates, configuration conditions, retrieval timestamps, original sources, page/section evidence, and review status. "Approved for this model" and "installed on this individual aircraft" are separate relationships.

## Data access and scheduling

Authenticated FAA DRS access passed sample metadata, PDF-download, and pagination checks for TCDSs, STCs, and emergency ADs. eCFR/Federal Register/GovInfo retrieval also passed. The detailed evidence remains in `data-feasibility/`.

Proposed polling: daily for TCDSs, STCs, and eCFR metadata; every four hours for AD and Federal Register discovery where supported; weekly reconciliation. Validate source limits and source update cadence before enabling unattended jobs. Store checkpoints only after complete successful batches and overlap incremental windows to accommodate corrections and delayed records.

Outstanding checks include positive-result last-modified filtering, filtered model retrieval, additional attachments, repeated polling, full-catalog coverage, and historical CAR/amendment text. Manufacturer manuals and referenced service material may need separate access/licensing.

## Decisions to ask the user

Before step 2: development database and hosting preferences, and source-control destination. Before expanding coverage: the aircraft families and configurations to prioritize. Before graph implementation: review a concrete navigation example. Before notifications: channels and digest frequency. Before publishing: domain, account/access policy, and reviewed coverage.

Ask questions when a user preference changes the implementation, and continue independent work while an answer is pending. Report each step's changes, validation, and remaining limits.
