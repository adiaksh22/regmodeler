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
- First NG AD/STC batch completed October 27, 2026:
  - reviewed AD 2001-14-05, official GovInfo document 01-17121 PDF page 2, and STC SA01635LA PDF page 1; exact identities, hashes and source limits are in `docs/boeing-ng-source-review.md` and the worker manifest;
  - published six physical relationships / eight public model paths for 737-700/-800, including Boeing elevator-tab repair-message and Aerocon master-index references; those referenced documents remain unobtained;
  - fixed FAA Series/canonical model mismatches in the graph through model entity IDs and in the model dropdown/family summary; source identities remain intact;
  - STC SA01635LA download contains one scanned page labeled Page 1 of 2; every path now explicitly states the second page is missing and complete certificate terms remain unverified;
  - candidate SA04009NY is deferred for both NG models because its original identifies ST04009NY; no graph evidence was published from it;
  - hosted migrations 20261027000200–20261027000400 and bounded source review are applied; repeated hosted review preserved eight paths. NG browser checks and existing MAX graph regression passed;
  - next source task: resolve the missing STC page and SA/ST identity discrepancy through authoritative records before expanding those claims. Site remains unpublished.
- STC source-quality follow-up completed October 27, 2026:
  - targeted FAA queries found complete separate current ST04009NY (2025 reissue) and ST01635LA (2016 amendment) three-page certificates; exact current-source URLs/hashes and reviewed page limits are in `docs/boeing-stc-source-quality.md`;
  - preserved SA04009NY as deferred and SA01635LA as incomplete; no renumbering/equivalence/supersession was inferred. Curated public findings now link each original SA entry to a separate reviewed ST record;
  - added ten physical relationships / fourteen model-scoped paths for 737-700/-800, including AerSale design/AFMS/ICA and Aerocon model-specific maintenance references. Referenced supporting documents remain unobtained;
  - added FK-backed relationship model scopes so AC25-1346 appears only for 737-700 and AC25-1340 only for 737-800; public findings are bounded, publication/model checked and loaded on evidence selection;
  - migrations 20261027000500/20261027000600 are applied hosted; repeated hosted review preserved fourteen paths. Full local checks passed (80 frontend, 36 worker tests plus database, lint, types and build); browser smoke passed both complete STCs, both original findings, alternate links and mobile layout;
  - next engineering step: searchable server-paginated review coverage, then portfolio beta coverage/freshness audit. Original SA findings need authoritative clarification/missing material for any further claims. Site remains unpublished.
- Review coverage search/pagination completed:
  - replaced full-model browser downloads with one `search_review_queue` RPC returning 20 rows, exact filtered total and model-wide reviewed count; server cap is 50, with deterministic ordering and literal case-insensitive number/title search;
  - added status/type filters, 250 ms debounce, Previous/Next controls, loading/empty/retry states and late-response guards. Changing model or filters cannot display stale results;
  - migration `20261027000700_review_queue_search.sql` is applied hosted. Invoker rights preserve publication RLS; changed-source priority now resolves historical FAA Series aliases by model entity ID;
  - full local quality gate passed: 83 frontend tests, 36 worker tests, database, lint, types and production build. Additional database regression for changed-source alias priority passed;
  - `scripts/review-queue-smoke.cjs` passed against hosted public data: 737-800 pages returned 20 of 1,067 pending candidates in 10.8/11.0 KB; reviewed/type/search/empty results, mobile width, zero browser errors and a separate enforced 50-row API ceiling passed;
  - this change issues no FAA calls or imports. Exact counts still scan the scoped queue on the server; network payload/browser memory are bounded;
  - next: clarify reviewed/metadata/incomplete/deferred source states, then audit monitoring/freshness and end-to-end beta journeys. Site remains unpublished pending the user's release decision.
- Source status presentation completed:
  - shared labels/guide now distinguish Metadata candidate, Reviewed connection, Review deferred, Excluded from reviewed graph, historical/unknown review states, Incomplete original and Record identity mismatch;
  - review state, saved PDF/additional-file retrieval and curated completeness/identity findings remain independent. SA01635LA shows reviewed + incomplete; SA04009NY shows deferred + mismatch; no SA/ST identity equivalence is inferred;
  - related browsing gets review status from the public queue, rather than inferring it from any graph edge. Bounded page RPCs include compact quality flags; detailed notes remain selection-only, including an expandable queue note control. Private notes and unpublished/wrong-model flags are not exposed;
  - fixed stale load-more responses appending an old related-record page after changing filters/model, with a regression test;
  - visual review found hard-coded current Revision 81 wording in the family summary alongside the catalog's Revision 82. Replaced current claims with actual evidence revision and comparison to the imported current-version pointer; MAX 10 boundary wording now explicitly refers to reviewed evidence. Further catalog-versus-imported-current alignment belongs in the next freshness audit;
  - migrations `20261027000800_source_status_labels.sql` and `20261027000900_variant_evidence_status.sql` are applied hosted. No FAA imports or reviewed data writes were performed;
  - verification passed: 90 frontend tests, 36 worker tests, embedded database publication/model/private-note/status/freshness checks, lint, typecheck and build. Hosted source-status and review-queue browser checks passed; 20-row pages remain about 11 KB. Desktop/mobile screenshots inspected;
  - next: audit daily/weekly workflows, failures/freshness visibility, catalog snapshot versus imported current-version alignment and stale-evidence suspension. Known history-loading effect cancellation should be checked during end-to-end journey QA. Site remains unpublished.
- Monitoring/freshness audit completed October 28, 2026:
  - verified GitHub daily and weekly workflows active and `SOURCE_CHECKS_ENABLED=true`; recent scheduled jobs fail on PA-28 STC exact tuple validation. Daily continues other sources; weekly now continues all source steps after individual failures;
  - scoped FAA diagnosis: 857 returned PA-28 STC records include eight records with unsupported model/certificate tuples across five displayed numbers. Details in `docs/monitoring-audit.md`. No incorrect scope was inferred and validation was not weakened. Last successful PA-28 STC check remains October 23;
  - added sanitized delta-phase failed-attempt logging so failures before full importer creation are visible. No failure advances the checkpoint; unchanged success retains one existing zero-record heartbeat;
  - generic TCDS imports previously omitted change observations, producing a false missing Boeing baseline. Wrapped the guarded service-only commit to record observations atomically, with canonical reviewed aliases; backfilled only absent baselines from existing archived data without inventing history;
  - migration `20261028000100_monitoring_audit.sql` applied hosted. Monitoring now uses genuine successful completion time, distinct from checkpoint maintenance. Hosted Boeing baseline is confirmed ready;
  - all six sources have clear family/type labels and failed/overdue/unconfirmed/running/baseline states. TCDS detail reuses the existing startup monitoring request and flags health attention; feed supports all eight monitored models and routes Boeing links to A16WE;
  - fixed revision-history effect cancelling its own request. Browser verified completed real hosted history, source filters, failed PA-28 STC visibility, correct certificate paths and mobile layout;
  - hosted A16WE delta check returned two overlap records, `reconciled:false`. Hosted PA-28 STC attempt reproduced `OUT_OF_SCOPE_RELATED_RECORD` and persisted the failure. No full FAA archive/family reimport was performed for this audit;
  - local quality gate passed: 93 frontend and 38 worker tests, database baseline repair/event/privacy/current-version suspension tests, lint, types and build. Mobile health screenshot inspected;
  - next: design bounded quarantine/accounting for malformed returned STC matches without confusing unconfirmed scope with index absence; review A16WE Revision 82 originals before refreshing Revision 81 facts/paths; then complete remaining beta user-journey QA. Site remains unpublished. Internal ignored audit helpers live under `.artifacts/` and do not print credentials.
- PA-28 STC quarantine phase completed November 3, 2026:
  - implemented strict-review versus discovery-only unconfirmed-tuple handling, private immutable-hash quarantine archives, atomic query inventory/coverage commit, suspension of old model matches without false index-absence events, and public aggregate scope-gap disclosure;
  - local checks passed: 95 frontend tests, 40 worker tests, database access/lifecycle tests, lint, types and build. Read-only current FAA verification returned 857 records: 849 accepted model-index candidates, 8 unconfirmed records, 49 undated records;
  - migration `20261103000100_scoped_query_quarantine.sql` is applied hosted. The bounded metadata import completed through ignored `.artifacts/import-quarantine-hosted.mjs`: 857 returned, 849 accepted candidates, 8 quarantined, 49 undated and 1,416 model matches. No STC PDFs were fetched;
  - follow-up hosted delta read two overlap records with `reconciled:false`; stable unconfirmed records do not force another full import. Public coverage counts match the private inventory; previously trusted versions for held identities have no active model matches;
  - `scripts/quarantine-smoke.cjs` and monitoring/history regression passed against hosted public data. Mobile scope-gap panel visually inspected. Local complete quality gate passed: 95 frontend/40 worker tests, database lifecycle/access/transaction tests, lint, types and build;
  - coverage design and limits are documented in `docs/scoped-query-quarantine.md`. The prior PA-28 STC import blocker is resolved, while the eight disputed associations remain unconfirmed and excluded from model results;
  - next: review A16WE Revision 82 original pages before refreshing Revision 81 facts/TCDS paths, then finish beta journeys. Site remains unpublished. Local production preview is running on 127.0.0.1:4173 (exec session 79143).
  - implementation commit `f9e9637` pushed; GitHub quality run `41718504049` succeeded. Manual hosted daily workflow `41718582934` succeeded on that exact commit, including all six PA-28/Boeing TCDS/AD/STC source steps. Scheduled checks remain enabled. Ignored `.artifacts/source-run-status.ps1` provides sanitized step outcomes for future checks.
- A16WE Revision 82 review completed November 3, 2026:
  - official current source is `DRSDOCID161888576820261020201007.0001`, dated 2026-10-20; official and archived PDF SHA-256 `c61c215805c4210a6b6cd135099d41bb6dc244c72ee603de8bd512f75f964368` match. Only one current PDF was fetched; no family reimport;
  - PDF skill applied read-only; visually inspected pages 1,21,23,24,32,59,60,67,68 and compared selected NG text against Revision 81. MAX source/weight/airspeed pages now 67 and capacity/crew/altitude page 68;
  - Revision 82 lists 737-10 with 2026-10-20 approval date, 197,900 lb MTOW and exit-dependent maximum 230 passengers (Type C mid-cabin exit). Retired the old current project notice while preserving its historical entity/profile;
  - migration `20261103000200_boeing_revision82_review.sql` applied hosted. New exact-source review worker verified current FAA metadata/PDF and private archived bytes, then promoted seven approved variants, 49 revision-bound facts and 21 current TCDS paths. Repeat review preserved counts;
  - fixed variant-fact view to use the profile's exact evidence version, preventing old/new fact JSON key mixing. Old facts/paths remain stored and future current revisions still suspend the TCDS paths;
  - MAX 10 AD/STC discovery remains unconfigured; UI explicitly states TCDS-only coverage. Existing six-model Boeing discovery/monitoring scope is unchanged;
  - local quality checks passed: 96 frontend, 43 worker tests plus database guards/idempotence/revision-isolation tests, lint/types/build. `scripts/revision82-smoke.cjs` passed real graph links, exact archived page, new-model facts/conditions, model switching, history and mobile width. Desktop screenshot visually inspected;
  - user answered UI preference: **make the node/network view easier to explore first**. Next UI work should focus on clear node focus/navigation and easy access to exact evidence. Site remains unpublished.
- First network UI refinement pass completed:
  - added focused-node context, a bounded exploration breadcrumb trail, Back one node, Show all nodes and Fit map;
  - split connection-card source selection from Explore-neighbor actions, so users can follow reviewed paths without precise canvas clicks. Traversal never edits relationships; filters reset navigation state;
  - viewport now fits a selected node and its direct neighbors, refits after canvas resize, and supports smaller overview zoom. Mobile visual QA caught/fixed an empty-canvas resize condition; selected-node intersection is now a browser assertion;
  - complete local checks passed: 99 frontend/43 worker tests, database guards/lifecycle checks, lint/types/build. `scripts/graph-navigation-smoke.cjs` and updated `scripts/revision82-smoke.cjs` passed hosted data, source-PDF viewing, navigation and mobile layout; mobile screenshot inspected;
  - current next stage is continued **network UI readability/layout and beta journey refinement**, followed by release preparation/user approval. The selected Boeing data review is finished; avoid adding unrelated source-expansion work before UI polish. Site remains unpublished.

- Second network readability pass completed November 3, 2026:
  - focused views now lay out only the selected node and direct reviewed edges, rather than dimming the full catalog. Visible/total counts, complete filtered-node search, direction, traversal history and explicit overview restoration are preserved; blank canvas clicks no longer abandon focus;
  - neighborhood navigation resets local drag positions. React Flow remounts the scoped layout and refits on resize, preventing stale global positions from spreading a small neighborhood;
  - mobile source selection focuses/scrolls to its evidence inspector, with an explicit Return to relationship map action. Browser QA caught and fixed the new grid wrapper minimum-width overflow;
  - local quality gate passed: 100 frontend/43 worker tests, database guards/lifecycle checks, lint, types and build. Final production rebuild passed. Updated graph browser check verifies only direct edges, full overview restoration, mobile focus round trip, node visibility and no horizontal overflow; Boeing Revision 82/PDF/history regression passed. Desktop/mobile screenshots visually inspected;
  - next: final beta user journeys and accessibility/content polish across search, profile, graph, related records and change feed, then concrete release preparation for user review. Do not begin another source-expansion phase. Site remains unpublished.

- Beta journey and accessibility pass completed November 3, 2026:
  - previous graph commit d3a5ed2 passed GitHub quality run 41728639114;
  - added manual keyboard tab navigation (one Tab stop, arrows/Home/End move focus, Enter activates), active primary navigation, a recoverable unknown-route page, and a wrapping header verified at 320px;
  - restored model-scoped profile relevance labels to node-map connection cards; related-record counts now distinguish visible profile-filtered records from loaded index matches;
  - browser regression exposed controlled-node update churn: measurement-only React Flow changes previously cloned positions and every render rebuilt positioned nodes. Memoized positioned nodes and skip unchanged/non-position updates. Focused edge rendering now passes, with a unit regression guarding measurement-only rerenders;
  - updated profile smoke to wait for actual debounced query results, avoid network-idle waits and assert applicability filtering in the evidence list (an AD node can legitimately remain through other references). Corrected beta AD fixture to PA-28-181-supported 2022-03-15; 2020-24-05 is not a current PA-28-181 index match;
  - scripts/beta-journey-smoke.cjs passed search, manual keyboard tabs, 23-revision history, related reviewed evidence/history, active navigation, feed model filter, 320/390px layout, unknown/empty search recovery, simulated hosted outage with labeled snapshots and live retry restoration. Mobile retries use the default evidence list; saved fallback inventory is four current bundled snapshots;
  - profile, monitoring, graph navigation and Boeing Revision 82/PDF browser checks passed. Mobile home screenshot inspected. Final full quality gate passed: 103 frontend tests, 43 worker tests, embedded database access/lifecycle/revision checks, lint/types/build;
  - docs/beta-readiness.md records verified journeys and the remaining sequence: dialog keyboard/content review, representative owner/maintenance usability feedback, concrete Cloudflare release configuration/rollback review, then user release approval. Current project plan and stale hosting description updated. Site remains unpublished; no new FAA imports, hosted writes or credential changes.

- PDF accessibility and release preparation completed November 3, 2026:
  - prior beta commit d4f1988 passed GitHub quality run 41731778930;
  - replaced SourcePdf visual overlay with native HTML modal dialog in the browser top layer. Background controls are inert; native cancel/Close restore trigger focus, previous body scroll state is restored on close/navigation, and the dialog fits dynamic mobile viewport height;
  - added four component tests for cited attachment/page, close/cancel focus, sanitized archive failure and unmount cleanup. jsdom stubs only native dialog methods; scripts/pdf-dialog-smoke.cjs independently verifies real Chrome top-layer/inert/Tab/Escape/mobile behavior with an intercepted viewer fixture;
  - PDF dialog browser check passed; real archived Revision 82 page-67 viewer/model/history regression also passed. Mobile dialog screenshot inspected. No extra FAA reads or hosted writes;
  - added npm run build:release, a cross-platform Node wrapper enabling Vite's release configuration guard. Hosted HTTPS public configuration is required; demo/loopback configuration is rejected. Existing server-key protections remain active. Actual hosted-public release build passed locally;
  - scripts/test-release-config.mjs verifies missing/local rejection, hosted public success, server-key rejection and normal CI/demo support; it is now part of npm run check. The final full gate passed: 107 frontend/43 worker tests, embedded database checks, release config checks, lint/types/build;
  - docs/release-review.md gives proposed Cloudflare Pages settings, pages.dev address, deliberate first deployment, branch auto-deployment controls, deep-link checks and production rollback limits, checked against current official Cloudflare docs. Settings have not been applied and no deployment was created. Beta readiness, hosting guide and project plan updated;
  - next: obtain representative/user feedback and final release approval for the concrete beta, then configure/publish Cloudflare and verify the deployed build. Do not interpret another generic continue as approval to publish if the user has not explicitly approved release. Project-name availability, deployed routes/environment and first production deployment remain unverified. Site remains unpublished.
