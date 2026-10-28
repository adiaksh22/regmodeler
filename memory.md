# RegModeler autonomous run memory

Last updated: 2026-10-15 (Boeing related-source expansion locally and hosted verified)

## Five-Hour Phase Plan

### Hour 1 — finish the active Garmin publication review

- Complete the interrupted batch 6 documentation for AD 2024-14-03, AD 2022-03-15, and AD 2001-23-17.
- Verify browser behavior for their configuration/component graph paths, profile relevance, and official GovInfo final-publication links.
- Re-run the hosted review procedure to prove idempotence, run the complete local check suite, commit, push, and verify CI.

### Hours 2–3 — deepen relationship architecture

- Audit the current relational model, graph view, repository boundary, and profile relevance engine.
- Add normalized aircraft-family, variant, configuration, component, certification, and applicability relationships with database integrity constraints and typed application access.
- Represent conditional applicability explicitly so a source relationship can require a variant, installed component/configuration, serial or line range, and source evidence without overstating applicability.
- Add database and domain tests for valid links, rejected invalid links, deletion behavior, duplicate prevention, and user-facing relevance results.

### Hours 4–5 — Boeing 737 expansion, UI refinement, and final QA

- Add a sourced Boeing 737 family slice covering 737-700, 737-800, 737-900ER, 737 MAX 8, MAX 9, and MAX 10, while clearly distinguishing certified/current data from planned or provisional data.
- Add technical and operational facts only when backed by durable publisher evidence; expose provenance and review status in the UI.
- Refine aircraft-first discovery, model comparison, graph navigation, accessibility, responsive layout, typography, loading/empty/error states, and source explanations.
- Run focused tests after each feature, then run the entire check suite, browser smoke tests, hosted migration/import verification, security/secret review, production build, GitHub push, and CI verification.

## Starting state

- Branch: `main`, aligned with `origin/main` at `4d5fd73`.
- Active incomplete task: batch 6 Garmin provenance review is implemented locally and already applied once to hosted Supabase, but its review report, browser smoke test, idempotence check, final commit, push, and CI verification remain.
- Current hosted batch 6 result from the prior cycle: 26 scoped graph rows, 6 component paths, 136 total model-scoped graph rows, and 36 reviewed AD/STC model connections.
- The official final PDFs were reviewed from GovInfo because the corresponding FAA DRS main downloads resolve to HTML rather than stable PDF bytes.
- The production website remains unpublished by prior product decision.
- Unrelated workspace files will be preserved and excluded from commits.

## Phase log

- Run initialized; no implementation code changed before this plan was recorded.
- Hour 1 Garmin review completed locally and on hosted Supabase:
  - added the missing review report with official source URLs, pinned hashes, graph counts, profile behavior, integrity gates, and next work;
  - isolated Chrome smoke passed all 26 scoped rows, three profile choices, canonical shared nodes, STC traversal, exact PDF pages, mobile layout, and the browser-profile no-upload assertion;
  - repeated the hosted service-role procedure successfully: 16 physical paths, 26 scoped rows, and 26 unique model-scoped paths;
  - full `npm run check` passed: 72 frontend tests, 24 worker tests, all PGlite migration/integrity checks, lint, typecheck, and production build.
- Hours 2–3 architecture and Boeing data phase completed:
  - generalized FAA TCDS collection/import by exact certificate while preserving the established 2A13 path;
  - added foreign-keyed family profiles, page-cited variant facts, rule sets, alternative groups, and typed predicates with RLS and service-only writes;
  - imported and privately archived all 57 real FAA A16WE revisions; current Revision 81 is dated August 3, 2026 and hashes to `4a88ab57064783a155640b3eae4cbb812bb43596cce403f757c3d77be3f84e48`;
  - visually reviewed cited pages 1, 21, 23, 24, 32, 59, 60, 66, and 67 and corrected the 737NG VMO/MMO citation to page 23;
  - published six approved 737 variants, 42 facts, 18 graph rows, two shared engine identities, and a clearly unapproved 737 MAX 10 project boundary;
  - encoded AD 2022-03-15 as two OR branches containing four AND predicates each (16 public predicate rows across the two PA-28 model relationships);
  - hosted repeat check passed: 57 revisions, 7 displayed variant/project records, 18 unique graph rows, 16 structured predicates, and 19 idempotent reviewed relationships;
  - scheduled source workflow now reconciles A16WE alongside 2A13.
- Hours 4–5 UI and browser-validation phase completed:
  - redesigned navigation and aircraft-first home search, added the FAA family status/limits panel, and connected structured OR/AND applicability logic to evidence inspection;
  - made the node-link diagram the default desktop relationship view with semantic colors, focus, a legend, labeled links, keyboard-visible controls, and a compact mobile evidence list;
  - added a responsive variant selector, explicit MAX 10 certification boundary, source-page links, a project favicon, and clearer prototype/source-status language;
  - hosted browser smoke passed 57 revisions, seven variant/project records, technical facts, the MAX 10 boundary, node traversal, variant switching, archived citations, applicability logic, mobile layout, and zero browser/resource errors;
  - desktop and 390 px mobile screenshots were visually reviewed; the variant controls were adjusted to wrap on small screens.
- Final local QA completed after mobile polish: `npm run check` passed 75 frontend tests, 25 worker tests, all PGlite migration/integrity checks, lint, typecheck, and production build; the hosted browser smoke passed again.
- Secret boundary review completed: local environment files and downloaded FAA artifacts remain ignored, and no token-shaped values were found in the commit candidates.
- Main implementation commit `1a61b09` (`Add FAA-backed Boeing family architecture`) was pushed to `origin/main`.
- GitHub Actions quality run `38690556727` completed successfully for the exact implementation commit.
- Workspace resume point: the production site remains deliberately unpublished. The next evidence phase is to review a small, high-value set of current Boeing 737 ADs/STCs and encode serial/configuration applicability against the new predicate architecture before preparing the portfolio beta.
- Follow-on Boeing related-source phase completed locally and on hosted Supabase:
  - added family-scoped AD/STC contracts with exact FAA label-to-canonical-model mappings and A16WE tuple validation;
  - added foreign-keyed source/model scope tables, service-only atomic catalog commits, generalized monitoring and public last-checked data;
  - replaced the initial row-by-row family transaction after a safe statement-timeout rollback with a tested set-based transaction;
  - archived and committed 418 AD records (971 model matches) and 2,601 STC records (4,722 model matches, 84 undated) with both hosted checkpoints baseline-ready;
  - included all six approved family variants in discovery; 737-7 currently returns zero exact FAA AD/STC records, while 737-10 remains outside the approved-model scope;
  - expanded the isolated browser smoke to verify live 737-8 related records and the metadata-versus-reviewed-evidence boundary.
- Final verification passed: 75 frontend tests, 26 worker tests, all database migration/integrity checks, lint, typecheck, production build, and the expanded hosted browser smoke including live 737-8 AD discovery.
- Related-source commit `89e62c7` (`Expand Boeing related-source catalogs`) was pushed to `origin/main`; GitHub Actions quality run `38766190206` completed successfully for the exact commit.
- Current resume point: begin page-level review of selected high-value 737 AD originals and encode serial/configuration predicates before publishing their graph edges. The production site remains deliberately unpublished.
- Lean-loading and bounded-source phase completed locally and applied to hosted Supabase:
  - initial TCDS exploration now loads only the certificate summary, graph core, variants and freshness; revision history, applicability rules and historical regulation text load only when opened;
  - related AD/STC browsing uses a server-filtered 24-row page instead of downloading the full model index; the hosted warm benchmark was about 0.25 seconds for summary/core requests and 0.61 seconds for a 24-row 737-800 STC page (about 16 KB);
  - daily workers now query a one-day-overlap delta window and record a zero-write heartbeat when unchanged; a detected change triggers full scoped reconciliation;
  - a separate weekly full reconciliation catches undated records and removals, while hard per-family/type record ceilings prevent accidental FAA-wide ingestion;
  - migration `20261015000300_lean_catalog_reads.sql` is applied to hosted Supabase; local frontend, worker and database tests pass. Hosted run `38771138918` succeeded for commit `f50f7cf`: all six sources reported `mode: checked` and `reconciled: false`, proving unchanged daily runs perform only bounded overlap reads and zero-record freshness heartbeats. Weekly reconciliation covers undated records, removals and silent anomalies.
- Local TCDS availability/load repair completed October 27, 2026:
  - the development frontend had been pointed at stopped local Supabase (`127.0.0.1:54321`), causing both eight-second timeouts and the demo/error notices; only the ignored browser-safe `VITE_*` values were switched to the hosted public URL/key, while local backend/FAA variables remain unchanged;
  - TCDS detail now renders its verified bundled certificate summary immediately and hydrates the live catalog/graph concurrently;
  - detailed applicability rules and regulation text no longer issue requests for the default graph selection; they load after an explicit evidence selection;
  - headless Chrome verified A16WE and 2A13 without fallback notices or failed requests. Warm live completion measured about 2.0 seconds for A16WE and 0.55 seconds for 2A13, while certificate document information appears before live hydration.
- First Boeing AD evidence phase completed October 27, 2026:
  - reviewed Current AD 2021-09-08 with one exact FAA document-number request; downloaded and visually reviewed official GovInfo PDF page 3 (printed 22862), SHA-256 `b6fbc4a4d33cadab1c2deb6836fc8b467ce4a2c120c68b33d93c874db25089dc`;
  - added a manifest, bounded verification/review worker, service-only atomic SQL review and explicit production-line/original-certificate-date predicate kinds;
  - published four physical relationships / six public paths for Models 737-8 and 737-9: model-specific conditional AD links and shared P6/SPCU and main instrument panel assemblies; each model has three AND predicates and no inferred Boeing profile/compliance result;
  - migration `20261027000100_boeing_first_ad_review.sql` and original archival are applied to hosted Supabase; no full FAA/family import was needed. Attachments remain pending;
  - full quality gate passed and the hosted production-preview browser smoke passed both models, applicability details, official links, shared panel traversal and mobile width;
  - next evidence batch: selected 737NG AD plus selected STC/AML, with canonical model aliases, page review and scope guards. Production remains unpublished.
