# RegModeler audit — November 3, 2026

Original audited commit: `cac5ba68b61e475d8cd2717246c47758373aa6b9`. The initial audit did not change application code or hosted records because the user requested findings first. The later authorized fixes are recorded in the remediation follow-up below. The website remains unpublished.

## Assessment

At the initial audit, the tool had useful, traceable research workflows but was **not ready for publication**. The model/evidence defects, storage/draft recovery, personal-link workflows and route/context repairs found then are implemented and tested, as recorded below. Assistive-technology/usability validation and release checks still require work before publication.

The existing source architecture has valuable safeguards: immutable source fingerprints, private originals, publication controls, source-version review guards, model-scoped relationships, quarantine, and separate discovery/review states. Passing these controls establishes evidence provenance and selected invariants. It does not establish that every relationship has been independently re-reviewed against every original, that FAA coverage is complete, or that any individual aircraft complies.

Severity: **P1** means fix before beta publication; **P2** means material usability, resilience, or maintenance work; **P3** means further polish or validation. Findings distinguish browser reproductions from code inspection and recommendations.

## Remediation follow-up — first repair phase

After reviewing the findings, the user authorized implementation. **A01–A05 are now fixed locally and regression-tested in Windows Chrome and Edge.** The findings below preserve the original audit baseline; they are not claims that these five defects remain present.

- Unreviewed model summaries explicitly show that technical facts are unavailable; another model is never substituted.
- Detailed evidence is bound to model, relationship and source-version context. Context changes hide previous results immediately, and obsolete responses cannot replace current details.
- Detail failures have an explicit error/retry state, distinct from successful empty results. Retry was verified against actual published AD conditions after a simulated outage.
- Home search uses canonical aircraft aliases, preserving `737-800` selection through the family card.
- Legacy personal records are validated before reading or writing. Invalid originals are preserved; failed writes report recovery guidance. Page exceptions are contained without removing navigation. The startup storage guard handles a read-denied/write-allowed storage case that otherwise crashes an auth-js diagnostic read before React renders; readable browser storage is unchanged.
- The full gate passed with 137 frontend tests and 45 worker tests, database checks, release configuration, lint/types/build. One additional legacy prototype-key test then passed in the eight-test storage suite, bringing frontend coverage to 138 tests. The final build includes its null-prototype migration fix.
- `scripts/audit-correctness-smoke.cjs` passed in both browsers: all 17 selected models, removal of stale rules, explicit failure/retry, exact model search, malformed/wrong-shape legacy records, denied-storage startup and zero browser errors. Existing network-design and profile browser journeys also passed.
- Final beta and family-geometry checks passed. The real Revision 82 cited-PDF journey timed out once opening the viewer during the concurrent run, then passed on an isolated rerun; the cause was not established. Preserve this intermittent result rather than treating it as proof of flawless viewer availability.

The first phase did not change hosted data or publication. The later loading/navigation phase is recorded below; the remaining audit items and complete FAA coverage are not implied by these fixes.

## Remediation follow-up — November 16, 2026

**A06 and A07 are fixed for the aircraft explorer; A08's scoped reads, completeness checks, cache, and visible search ceiling are implemented.** Broader graph projections/neighborhood APIs and production load testing remain expansion work.

- “Explore referenced documents” now focuses the canonical source node, restores keyboard focus, and adds a reversible history step. The selected source citation stays in the inspector, including its actual archived PDF page. It also continues to work in Paths/Evidence list.
- Relationships, technical profiles and monitoring resolve separately. Slow or failed secondary sections cannot erase a successful graph. Each section has its own retry; a failed refresh retains successful same-scope data with its load time. New model/source-version contexts cannot reuse another scope's rows or citation selection. A failed catalog refresh retains the last successful catalog record instead of silently reverting to an older bundled snapshot.
- Normal reads request the selected model. Family comparison requests the wider certificate scope explicitly; Boeing still opens in its chosen family mode by default. Graph reads use 250-row pages, exact counts, stable ordering, duplicate/changing-count detection, and ceilings of 1,000 model rows or 2,000 family rows. Truncation and excessive scopes produce explanatory errors instead of a partial graph presented as complete. Technical-profile reads also verify a bounded count.
- A bounded 32-entry memory cache shares simultaneous reads, keeps successes for two minutes, and discards failures. Keys include certificate, model/family scope and the catalog's revision identity. Refresh/retry invalidates the appropriate cache. This cache contains public source data and does not store aircraft profiles.
- The browser uses one shared public database client, one eight-second attempt and explicit retry controls. The installed SDK's automatic GET retries had been extending failed reads and adding requests. A regression using the actual SDK verifies one request on a simulated 503. Worker retry/scheduling logic was not changed.
- Browser testing exposed two additional transition issues, both fixed: changing section status could recreate graph nodes and lose measured edges, and overlapping old/new canvas initialization could lose keyboard focus. Stable graph inputs and focus restoration against the mounted selected node now preserve both.
- The current hosted catalog reports **A16WE Revision 83**. The seven technical profiles remain bound to reviewed Revision 82. As observed November 16, the public Boeing graph returned 28 AD/STC model-scoped rows and no TCDS rows, as required by the existing source-version guard. The UI now explains the renewed-review gap and never substitutes another model's citation when the selected model has none. No Revision 83 source promotion or technical fact review was performed in this UI/data-read phase.
- Full local checks passed: **153 frontend tests, 45 worker tests**, database/release/lint/types/build checks. The new loading journey passed in Chrome and Edge, including section failures, cache reuse, rejected partial/oversized responses and mobile width; its final version also opens a real reviewed archive at the selected citation page. Earlier model/storage regressions, source-status/review-queue journeys, profile, beta and native dialog checks are tracked in memory with final outcomes.

The older `revision82-smoke.cjs` and `family-graph-smoke.cjs` assert an exact current Revision 82 family inventory. They are historical checks while Revision 83 awaits review, not current hosted release gates. Database fixtures continue to verify Revision 82 facts and suspension on a newer source. The native modal check now uses a currently reviewed source and verifies its selected page dynamically.

### November 16 source-review follow-up

The subsequent [targeted Revision 83 review](boeing-revision83-review.md) restored the Boeing TCDS network after matching current FAA and archived bytes and rechecking the cited pages. Hosted results: 17 models, 41 current TCDS paths, seven profiles and 49 facts. The service-only transaction retains exact-original guards and historical facts; AD/STC scope is unchanged. Current `family-graph-smoke.cjs` and new `revision83-smoke.cjs` passed in Chrome and Edge, including physical pages 1/67, arrow boundaries after dragging, model switching and mobile width. Earlier observations above describe the pre-review state and remain part of the audit history.

### November 16 graph readability and motion follow-up

**A09's responsive family presentation and A10's stable canvas/motion/overlap repairs are implemented.** The family layout uses six, four or two model columns according to canvas width, with shared certificate/engine identities retained. A taller narrow-screen family canvas shows every member instead of cropping them to preserve a minimum zoom. Labels compensate for zoom within a bounded scale; the tested family labels remain at least 12 screen pixels at widths 320, 390, 768 and 1600. Full dense-catalog overviews can still require Readable zoom or a focused neighborhood. Fit map fits all visible nodes, while Readable zoom centers a readable close-up. Hover and keyboard focus highlight incident paths without changing evidence.

- React Flow no longer remounts when exploring another node or changing the relationship filter. Shared nodes interpolate over 240 ms; the camera uses a short transition, and user interaction interrupts layout motion. System reduced-motion preferences disable those transitions and the edge-color transition, including preference changes during a layout.
- Drag constraints preserve space for symbols and labels while leaving other nodes still. A curved boundary-to-boundary route keeps an edge represented if circles temporarily pass during interpolation. Fixed node measurements preserve React Flow handle bounds across controlled position updates; the new stress check confirmed all 41 family edges remain rendered throughout dragging onto another model. This is bounded deterministic motion, not a continuous force simulation.
- Narrow-screen map backgrounds scroll the page by default. Move map explicitly enables panning; Scroll page restores native page scrolling. Zoom controls remain available, normal mouse-wheel page scrolling is preserved, and primary graph controls have 44-pixel targets.
- `scripts/graph-ui-smoke.cjs` verifies readable labels, full family fit, keyboard path highlighting, collision handling with frame-by-frame edge counts, stable canvas identity, readable zoom/fit, reduced motion, mobile touch scrolling and pan controls. It supports the same base URL/browser overrides as the loading check. Frame observations are machine-specific rather than a performance guarantee; source review, accessibility certification and real-user usability are separate work.

### November 16 personal-workflow follow-up

**A11 draft recovery and A12 personal cross-reference workflows are implemented.** The remediations appear beside the original findings below. Full local checks passed 181 frontend tests and 50 worker tests, database migration/access checks, release configuration, lint, types and production build. The updated profile journey and new `personal-workflows-smoke.cjs` passed in Windows Chrome and Edge, including incomplete edits, model isolation, saved-only relevance, stale updates, private network boundaries, valid destination navigation, explicit merging, removal/Undo and mobile width. Chrome loading/source-navigation and audit-correctness regressions also passed.

Edge's first memory-fallback journey timed out; an isolated rerun passed without a production-code change. The smoke now records the precise phase, URL and isolated test-profile value on failure. This intermittency remains documented. No hosted data, source imports or publication changed in this phase.

### November 16 route/context/accessibility follow-up

**A13's route titles/focus, visible guidance and shared exploration context are implemented.** Home, source changes, certificate routes, unknown routes and page-error recovery use a completed-content heading that sets the document title and receives focus on a pathname change. Suspense placeholders do not steal focus; query-only model/filter changes and same-page title updates preserve it. Heading focus supplies the route announcement without a second live-region announcement. The legacy issue-status selector already had an accessible name; browser checks now verify its accessibility-tree name and saved update.

The context panel distinguishes selected aircraft/saved configuration, model/family network scope, explored node and source citation/model. A family citation for another model explicitly says it differs from the selected aircraft; hiding the inspector retains that context. Paths and Evidence list use the same summary. A concise visible instruction and expandable keyboard/map controls explain node activation, Back, overview and selector/card alternatives. High-contrast focus outlines and 44-pixel connection/trail targets support exploration. Context typography uses relative units and reflows when enlarged. Reduced-motion CSS now covers application card transitions as well as the existing interruptible graph motion hook.

The new `context-accessibility-smoke.cjs` passed in Windows Chrome and Edge at desktop and 320/390px widths, including skip link, titles/focus, the actual model-versus-source transition, hidden inspector, Back/list/Paths consistency, context text contrast against its solid background, visible focus, 200% root-font enlargement/reflow, reduced CSS motion and unknown-route recovery. Existing graph UI journeys passed in both browsers, preserving 17 models/41 family paths, arrows during overlap, touch scroll and reduced motion. Loading/source-navigation and profile regressions passed in Chrome; personal-link/draft regression passed in Chrome and Edge. A profile input test exposed unreliable triple-click selection (text appended instead of replaced); test helpers now use explicit keyboard Select All and immediately assert the entered value. No production profile rule was changed to satisfy it. The full local gate passed 187 frontend/50 worker tests and database/release/lint/types/build checks; a final same-page-title regression brought the passing frontend suite to 188. The final guidance/CSS refinement also passed targeted tests, lint, types and build.

### November 16 portable browser and operations follow-up

**A15's portable browser gate is implemented.** Root Playwright 1.65.1 with its matching managed Chromium runs eight journeys across desktop/mobile projects. It builds an isolated production bundle, manages a strict-port server, blocks all non-fixture traffic and rejects unexpected endpoints. It needs no FAA/Supabase credentials or archived research dependencies. The GitHub `browser` job runs alongside `check`, with no automatic retries and seven-day failure traces/screenshots/reports. Test code/configuration are linted and typechecked. Existing live hosted/source/archive scripts remain separate integration evidence.

The fixture network exercises 17 models/41 family paths and actual arrow boundary geometry, independent failure/retry/scoped caching, incomplete responses, profile/privacy/storage recovery, personal links and native dialog behavior. Its source text and simulated archive frame are explicitly synthetic, not regulatory evidence. Fixture mistakes were corrected without relaxing production completeness checks: expose `Content-Range` through CORS and wait for the initial catalog read before measuring form-triggered requests. Native dialog tests verify background controls are inert, while allowing browser-chrome focus during Tab traversal, as the earlier dialog regression already did. See [browser testing](browser-testing.md).

The [operations review](release-operations.md) records read-only observations: daily/weekly source jobs enabled with recent successful runs and all six public source groups reporting successful established baselines. It does not claim notification delivery, backup/restore, branch enforcement or viewer rate/budget protection is configured. Static Pages headers and release packaging checks are prepared, with fixture/test hosts rejected for release builds. Patched XML parsing/development dependency resolutions removed known audit advisories; unused Dagre was removed after confirming no active imports. Local full checks passed 188 frontend/50 worker tests plus database/release/lint/types/build; separate release build/asset checks and dependency audit passed. Browser journey outcomes are tracked in beta readiness/memory and GitHub quality for the selected commit.

Next: remaining production safeguards and human/assistive-technology validation, then explicit beta/publication review. Automated checks do not establish complete FAA coverage, WCAG conformance or individual-aircraft compliance. Site publication still awaits explicit release approval.

## P1 — correctness and recovery

### A01. A selected model can display another model's technical specifications

- **Confirmed in Chrome and Edge.** Open `/tcds/A16WE?model=737-100%20Series`. The model selector and TCDS citation say `737-100 Series`; the technical summary above them shows `737 MAX 10` and its specifications.
- Cause: [AircraftFamilySummary.tsx](../src/components/AircraftFamilySummary.tsx) falls back to `approved[0]` when the selected model has no detailed profile. Ten of the 17 basic family identities lack detailed technical profiles.
- Impact: accurate source facts become misleading when presented in the wrong aircraft context.
- Fix: show the selected model's explicit “technical profile not reviewed” state. If a separate comparison model is useful, label and control it independently.
- Acceptance: select all 17 models; every technical summary must either match the selected identity or state that its facts are unavailable. Test direct URLs, dropdowns, and family buttons.

### A02. Applicability rules remain visible after switching models

- **Confirmed in Chrome using real hosted evidence.** Open the 737-8, show all nodes, and select the conditional applicability connection for AD 2021-09-08. After its structured conditions load, switch to `737-100 Series`.
- The inspector changes to the 737-100's TCDS page-1 citation, but still displays the 737-8 AD's model, production-line range, and original-certificate date conditions.
- Cause: [AircraftExplorer.tsx](../src/components/AircraftExplorer.tsx) clears the selected evidence ID on model changes but retains `evidenceRules` and `sourceMaterials`; the loading effect returns early when no evidence ID exists.
- Fix: store detail results with their exact relationship/model/version identity. Render them only when that identity matches the visible citation. Reset loading, errors, rules, and materials together on every context change.
- Acceptance: model changes, URL changes, browser navigation, filters, family scope, and view changes never display details from another citation. Include slow and out-of-order responses.

### A03. Corrupt legacy browser storage crashes entire pages

- **Confirmed in Chrome and Edge, in isolated temporary browser profiles.** Put malformed JSON in `tcds_cross_references` or `tcds_revisions`, then open a TCDS page. Put malformed JSON in `tcds_issues`, then open Source changes.
- All three cases produced a JSON parse exception and an empty page body, including disappearance of primary navigation.
- Cause: unchecked `JSON.parse`/storage access in [crossReferenceManager.ts](../src/utils/crossReferenceManager.ts), [revisionManager.ts](../src/utils/revisionManager.ts), and [storageManager.ts](../src/utils/storageManager.ts). No application error boundary contains the failure.
- Fix: use validated, non-destructive reads and recoverable storage errors throughout, following the stronger profile-store pattern. Preserve unreadable data rather than silently erasing it. Add an error boundary with a usable navigation/retry path.
- Acceptance: malformed JSON, valid JSON of the wrong shape, blocked storage, and quota failures cannot prevent source browsing or the shared feed from working.

### A04. Exact NG-model search opens the wrong aircraft context

- **Confirmed in Chrome.** Search `737-800` from Home and open the returned Boeing card. Its URL omits `?model=...`; the detail page selects `737-100 Series`.
- Cause: [HomePage.tsx](../src/pages/HomePage.tsx) compares the input literally with FAA labels such as `737-800 Series`. The detail page's canonical alias handling is not reused by the search card.
- Fix: normalize model identities consistently during search, result rendering, and navigation. Present multiple model matches explicitly when a query is ambiguous.
- Acceptance: `737-700`, `737-800`, `737-900ER`, their Series aliases, MAX model identifiers, and PA-28 models preserve the intended selection end to end.

### A05. A failed detailed-evidence request looks like missing evidence

- **Code-confirmed, with simulated browser request failure.** The detailed-evidence effect in [AircraftExplorer.tsx](../src/components/AircraftExplorer.tsx) catches failure by stopping the loading indicator, without an error message or retry action.
- Structured rules disappear. A regulatory provision can then say its historical wording has not been imported even when the request failed instead.
- Fix: distinguish not loaded, loading, loaded-empty, and failed. Keep a visible failure/retry state bound to the selected citation. Do not infer source absence from a failed request.
- Acceptance: a simulated 503 or timeout produces an explicit message and working retry; it never changes the apparent review/import status.

## P2 — navigation, graph behavior, and resilience

### A06. “Explore referenced documents” does not traverse the node map

- **Confirmed in Chrome and Edge.** In the PA-28-181 node map, select AD 2001-23-17 and click “Explore referenced documents.” The heading changes to “How AD 2001-23-17 connects,” but the map does not focus that source. There is no corresponding “Back to PA-28” action in node mode.
- Cause: the action only changes `expanded`, which controls Paths/Evidence list; `NodeGraph` maintains separate focus state.
- Fix: give this action an explicit map-focus command, or intentionally open the appropriate view. Preserve consistent Back/breadcrumb behavior.

### A07. Secondary API failures erase otherwise usable explorer data

- **Code inspection:** `loadExplorerDetails` in [catalog.ts](../src/lib/catalog.ts) groups graph, monitoring, and variant requests with `Promise.all` and rejects the entire result when any one fails.
- Impact: a failed technical-summary or health endpoint hides successful reviewed graph data and repeats the broad “history and relationships unavailable” message.
- Fix: independent section states and retries, retaining successful responses. Identify which section failed. Keep last successful data visibly dated when appropriate.
- Acceptance: fail each endpoint independently; unrelated sections remain usable.

### A08. Reads are scoped, but graph loading will not scale safely as written

- **Code inspection and measured payloads:** the browser requests all `model_graph` columns for an entire TCDS, then filters locally. There is no graph response cache, continuation mechanism, or completeness signal. The repository's PostgREST setting is `max_rows = 1000`; the actual hosted ceiling was not independently queried.
- Today's measured decoded graph bodies were approximately 176 KB for 2A13 and 85 KB for A16WE. These are response-body sizes, not compressed wire sizes. They are modest today, but the pattern grows with reviewed coverage. A server row ceiling could eventually truncate a family without an explanatory UI state.
- Home search is also capped at 20 certificates without pagination or a “more results” indication. The current four-record catalog does not trigger that limit.
- Fix: bounded model/neighborhood RPCs, a separately bounded family overview, summary-versus-detail projections, explicit totals/continuation, and caching keyed by source revision/scope. Deduplicate concurrent reads; cancel obsolete requests. Retain explicit refresh and freshness labels.
- **Keep the existing strategy:** daily scoped metadata deltas plus weekly scoped reconciliation, with originals fetched for review. Do not import the entire FAA catalog or fetch FAA records directly on every browser interaction.

### A09. Family overview fits the viewport at the expense of readability

Remediated for the tested family presentation; see the November 16 graph follow-up above. The bullets below retain the original finding.

- **Visual/browser confirmed:** on desktop, fitting 21 family-context nodes makes labels much smaller than ordinary UI text and produces many crossing links. On mobile, the minimum focused zoom preserves larger symbols but crops peripheral members. “Fit map” therefore does not necessarily show the whole family on a narrow screen.
- There was no document-level horizontal overflow at 320, 390, 768, 1024, or 1600 px in the tested Boeing journey. That does not make all graph content readable or visible.
- Fix: separate readable neighborhood exploration from overview. Consider generation groups, progressively expanded siblings, highlighted paths on hover/focus, and an explicit “Fit all / readable zoom” distinction. Keep every reviewed path accessible through the list.
- Do not invent model-to-model derivation relationships to make the diagram look connected; shared certificate/family identities already express reviewed connections.

### A10. Layout changes jump, and dragged nodes can hide their links

Stable canvas, bounded transitions, reduced motion and overlap handling are implemented; see the November 16 graph follow-up above. The bullets below retain the original finding. Real-user/device performance remains part of release validation.

- **Code and browser confirmed:** React Flow remounts when focus changes; custom Fit map uses `duration: 0`. There is no force simulation, collision avoidance, or animated layout interpolation. This is deterministic layout plus interactive dragging/panning/zooming.
- Dragging connected Boeing nodes onto one another reduced rendered edge paths from 41 to 40 because circle-overlap geometry intentionally returns no path. No collision constraint or alternate route explains the missing visual link.
- Fix: stable graph identity, short interruptible camera/layout transitions, overlap handling or routed edges, and reduced-motion support. Avoid continuous forces that make regulatory paths drift while someone reads evidence. A force engine is optional, not a prerequisite for a polished graph.
- Acceptance: arrows remain interpretable during drag/overlap, repeated navigation preserves focus, motion can be reduced, and active pan/drag frame pacing is measured on representative hardware.

### A11. Unsaved profiles are protected on model switching but lost on navigation

**Remediated November 16:** separate per-model tab backups recover incomplete edits after routes, reloads and model switches. A memory fallback preserves SPA navigation when tab storage fails and requests a browser leave/reload warning even away from the editor. Explicit save/discard, saved-only relevance and recovered-baseline conflict protection are tested. Closing a tab or a browser that suppresses warnings can still lose memory-only drafts.

- **Confirmed in Chrome:** edit a profile name without saving, then click Source changes in primary navigation. Navigation proceeds with zero confirmation dialogs and the draft is discarded.
- Fix: preserve a recoverable local draft or consistently guard route changes/reloads. Explain whether a draft or saved profile drives relevance. Keep profile data separate from source records.
- Existing strengths: validation, saved-versus-draft separation, concurrent-edit protection, corrupt-profile preservation, serial boundaries, unknown relevance, and model isolation passed the targeted profile rerun.

### A12. Personal cross-reference controls form an incomplete workflow

**Remediated November 16:** identifiers are normalized and syntax-validated, self/duplicate links are rejected, destinations are navigable, connected groups merge explicitly, members can be removed and removal undone. Stale writes/Undo and corrupt/full storage preserve existing records. One exact public catalog read checks destination coverage on submission; unsupported destinations explain coverage and provide FAA lookup/return links. These are personal browser groups, never regulatory graph edges.

- **Code inspection:** Link accepts arbitrary nonempty strings, including the current TCDS itself. Existing links display as non-clickable badges. Remove/merge capabilities exist in utilities but are not exposed here, and the page provides no clear validation/success feedback.
- Impact: owners can create a link that appears to do nothing, cannot traverse it, and cannot readily undo it. These are personal notes, not reviewed regulatory edges, but the workflow still needs to work.
- Fix: validate/normalize certificate identifiers, prevent self-links, make destinations navigable, expose removal, handle groups already containing either certificate, and explain unsupported catalog targets.

### A13. Accessibility and context need a dedicated completion pass

**Implementation follow-up November 16:** route headings/titles/focus, shared model/network/focus/citation context, visible keyboard guidance, relative context typography, graph target/focus improvements and application reduced-motion CSS are now implemented and browser-tested. The legacy select label was already present when this pass began and is verified. Original observations below remain the audit baseline; the manual/assistive-technology validation remains open.

- **Positive checks:** manual aircraft-tab navigation, keyboard node activation/focus restoration, native PDF dialog containment/Escape/return focus, skip link, and current navigation states pass their existing browser journeys.
- **Code/visual gaps:** route navigation does not manage document title or announce/focus the new page context; the legacy issue-status select has no accessible name; the most useful graph instructions are screen-reader-only; the UI uses several competing scopes (selected model, family network, focused node, cited source) without a compact shared context summary.
- No application reduced-motion policy was found. Some graph labels become tiny after zoom-to-fit; several small exploration controls warrant target-size/spacing review. This audit did not establish WCAG conformance or claim every small target violates a criterion.
- Fix: route titles/focus announcements, labeled legacy controls, concise visible graph guidance, clear model/focus/source context, reduced-motion behavior, and a documented keyboard/touch workflow.
- Remaining validation: NVDA with Edge, full rendered contrast audit including gradients, touch gestures on actual devices, browser zoom/text scaling, and real owner/maintenance user feedback. The limited solid-background contrast probe found no sampled failures; it intentionally skipped gradient backgrounds and is not an accessibility clearance.

## P2/P3 — coverage clarity, documentation, and engineering

### A14. Coverage labels and documentation disagree

- **Confirmed by inspection:** README's opening description still reports six Boeing variants, 42 facts, 18 paths, 57 revisions and MAX 10 absent from current A16WE. Earlier project-plan tables retain similar old counts and say reviewed Boeing AD/STC paths are future work.
- Current implementation/source review instead has 17 basic Boeing family/TCDS model identities, seven detailed technical profiles, 49 facts and 41 TCDS family/certificate/engine paths. AD/STC discovery remains configured for six Boeing models plus the two PA-28 models. These scopes must not be conflated.
- The technical-summary badge says seven models have reviewed approval evidence, which can be read as the total family approval coverage despite the 17-model basic review. Relabel it as detailed technical profiles.
- Boeing's current family expansion mainly maps family/TCDS/engine relationships; it does not provide a complete model-to-Part-25/amendment/special-condition/exemption graph. PA-28 historical CAR/CFR sources also remain selective. The site should show these coverage boundaries directly.
- Fix: one maintained coverage inventory, consistent UI labels, and a concise “what this model includes / not yet reviewed / last checked” panel. Preserve reference-edition dates; do not imply an older CFR reference is today's consolidated text.

### A15. Browser regression coverage is not a reproducible release gate

**Remediated November 16 for deterministic regression CI:** supported root Playwright dependency, managed browser/server, desktop/mobile fixtures, external-traffic rejection, failure artifacts and a separate quality job now replace the legacy dependency as the required browser gate. Legacy scripts remain explicit live integration checks; actual hosted PDF/source availability and representative-device/usability validation remain separate release work. See the follow-up above and [browser testing](browser-testing.md).

- **Confirmed:** `npm run check` and GitHub quality run lint/unit/worker/database/config/build checks, but not browser journeys. Browser scripts import Puppeteer from `research/legacy/mcp-client/node_modules`, hard-code a local Chrome executable and require a separately running preview with hosted data.
- `source-status-smoke.cjs` timed out: its initial expectation looks for ST01635LA in the connection list, but the default Boeing family-focused view intentionally shows family/certification paths. The test needs to navigate to the relevant scope before asserting those AD/STC records. Do not classify that timeout alone as a product defect.
- `profile-smoke.cjs` timed out once waiting for saved serial relevance after reload; an isolated targeted rerun passed the entire journey. Cause remains unconfirmed. Preserve this intermittent result and add diagnostic screenshots/network state rather than weakening the assertion.
- Other historical scripts contain earlier inventories. Their presence must not imply current passing coverage.
- Fix: supported browser-test dependency, parameterized browser/base URL, deterministic local read fixtures for CI plus a separate bounded hosted smoke, current test ownership, failure diagnostics, and the new accuracy/failure-state regressions. Remove the unused Dagre dependency when appropriate.

## Verification performed

| Area | Result and limits |
| --- | --- |
| Local quality gate | Passed: 120 frontend tests, 45 worker tests, embedded PostgreSQL migration/access/idempotence/source-version checks, release config checks, lint, types and production build |
| Chrome journeys | Beta search/recovery, family geometry, network design, graph navigation, Revision 82/history/real cited PDF, modal behavior, monitoring, review queue and quarantine passed |
| Profile journey | First run timed out at reload; full targeted rerun passed. Intermittency unresolved |
| Source-status journey | Timed out on an expectation incompatible with the new default family view; not reported as passing |
| Edge | Installed Windows Edge ran the custom normal/failure probes: family model/source selection, responsive widths, referenced-document action, detail failure feedback, and legacy-storage failures. The entire Chrome suite was not rerun in Edge |
| Responsive checks | Browser viewport emulation at 320/390/768/1024/1600 px on Boeing; existing mobile journeys on search, profiles, feed, related/review/PDF workflows. No physical mobile-device or Safari validation |
| Graph geometry | All 41 family-context edges meet circle boundaries; markers track a dragged node. Overlap exposes the separate disappearing-edge issue |
| Public Boeing rows | 69 model-scoped rows across 17 models had nonempty page/excerpt/source URL/version IDs. Shared-edge deduplication means row counts differ from unique canvas edge counts. This is a structural check, not independent validation of every excerpt |
| Primary source check | Read-only `review:boeing:index -- --verify-only` passed against current scoped FAA metadata and one original PDF; no import, review promotion, or hosted writes |
| PDF sample | Local A16WE Revision 82 SHA-256 matched `c61c215805c4210a6b6cd135099d41bb6dc244c72ee603de8bd512f75f964368`. Visually sampled physical page 68: passenger limits depend on exit configuration, and crew/altitude are certification limits. This did not re-review every original |
| Performance sample | Desktop preview graph readiness approximately 0.5–0.9 seconds in the measured session. Idle 90-frame samples had ~16.6–16.7 ms median gaps and no gap over 34 ms. These are unthrottled local-preview/hosted-data observations, not field p95 latency or active-gesture benchmarks |
| Security/source controls | Existing tests passed service-only review writes, private storage, publication checks, source-hash/edition guards, scoped quarantine and credential-origin protections. No penetration test, production abuse/load test, disaster restore, or deployed-header audit was performed |

Read-only PDF sample: [A16WE Revision 82](../.artifacts/a16we/revision-82.pdf), physical page 68. The local report links below are ignored diagnostic artifacts, not portable release dependencies:

- [Chrome/Edge findings](../.artifacts/full-audit-results.json)
- [Model/evidence state reproductions](../.artifacts/audit-state-results.json)
- [Performance/graph/search observations](../.artifacts/audit-polish-results.json)
- [Desktop family view](../.artifacts/audit-A16WE-desktop.png) and [mobile family view](../.artifacts/audit-chrome-mobile.png)

## Recommended execution order

November 18 usability follow-up: repaired search/graph-label contrast, page landmarks, profile heading order and named graph/status/profile groups. Added repeatable axe scans alongside the functional gate (26 desktop/mobile test cases). Live Chrome context and Edge cited-source/graph journeys passed; rendered-gradient text sampling passed in six selected views. This does not complete NVDA, real browser zoom, physical-device or representative-user validation. See [the findings and remaining review script](usability-review-2026-11-18.md).

November 16 launch-safeguard follow-up: deployed a service-only atomic shared signing budget (60/minute, owner-selected 1,000/UTC-day), fail-closed viewer behavior and accessible retry notice. Verified hosted concurrent reservations and actual published PDF signing. This is not a bandwidth or provider spending cap. Exported the actual application database and private archive, verified hashes and isolated restoration of 23 tables/18,558 rows, every foreign key, 136 cited originals and both anonymous-reader graphs. Added sanitized source-workflow outcome summaries; account notification delivery remains unverified. See [viewer usage](viewer-usage.md), [backup recovery](backup-recovery.md) and [release operations](release-operations.md). Website publication remains pending explicit approval.

1. **Correctness and recovery:** A01–A05. Bind every displayed fact/detail to the intended model and exact citation; normalize model navigation; make storage and evidence failures recoverable. Add real transition/failure regressions.
2. **Complete the workflows:** A06–A08, A11–A12. Repair reference traversal, independent loading/retries, bounded cached reads, draft protection and editable personal links. Verify Paths/Evidence list as well as the node map.
3. **Professional graph/accessibility pass:** A09–A10, A13. Readable neighborhoods and family grouping, stable short transitions, overlap-safe edges, reduced motion, keyboard/touch/context clarity. Benchmark active interaction before considering a force engine.
4. **Release confidence:** A14–A15. Reconcile coverage/documentation, make browser checks repeatable, conduct representative user/assistive-technology testing, then return to the existing explicit publication review. Do not expand source scope to avoid addressing these defects.

Before publication, also review source-viewer rate/usage protection and operational budgets: it is a deliberately public endpoint that creates temporary links for published PDFs, with no application-level throttling in the inspected handler. This is a cost/abuse-hardening review item, not evidence that private drafts are accessible. Confirm hosted backups/restore, scheduler failure visibility and production headers when preparing the deployment. These were not tested by mutating infrastructure during this audit.

During the original read-only audit, no application fixes, new aircraft imports, hosted migrations, commits, pushes, or publication were performed. Only its report, memory, and ignored diagnostic scripts/results were written. The subsequent authorized repair phase is tracked near the top of this document.
