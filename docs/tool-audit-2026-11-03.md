# RegModeler audit — November 3, 2026

Original audited commit: `cac5ba68b61e475d8cd2717246c47758373aa6b9`. The initial audit did not change application code or hosted records because the user requested findings first. The later authorized fixes are recorded in the remediation follow-up below. The website remains unpublished.

## Assessment

The tool has useful, traceable research workflows, but it is **not ready for publication**. Two confirmed display defects can associate the wrong aircraft specifications or applicability conditions with the selected model. Browser-storage failures can also blank an entire page. Correctness and recovery should come before further visual polish or aircraft expansion.

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

Remaining sequence: A06 reference traversal and A07/A08 loading/retry/bounded reads, then the remaining profile/link workflows, graph readability/motion/accessibility, documentation and release validation. No hosted data or publication was changed by this repair phase. The five fixes do not close the rest of this audit or establish complete FAA coverage.

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

- **Visual/browser confirmed:** on desktop, fitting 21 family-context nodes makes labels much smaller than ordinary UI text and produces many crossing links. On mobile, the minimum focused zoom preserves larger symbols but crops peripheral members. “Fit map” therefore does not necessarily show the whole family on a narrow screen.
- There was no document-level horizontal overflow at 320, 390, 768, 1024, or 1600 px in the tested Boeing journey. That does not make all graph content readable or visible.
- Fix: separate readable neighborhood exploration from overview. Consider generation groups, progressively expanded siblings, highlighted paths on hover/focus, and an explicit “Fit all / readable zoom” distinction. Keep every reviewed path accessible through the list.
- Do not invent model-to-model derivation relationships to make the diagram look connected; shared certificate/family identities already express reviewed connections.

### A10. Layout changes jump, and dragged nodes can hide their links

- **Code and browser confirmed:** React Flow remounts when focus changes; custom Fit map uses `duration: 0`. There is no force simulation, collision avoidance, or animated layout interpolation. This is deterministic layout plus interactive dragging/panning/zooming.
- Dragging connected Boeing nodes onto one another reduced rendered edge paths from 41 to 40 because circle-overlap geometry intentionally returns no path. No collision constraint or alternate route explains the missing visual link.
- Fix: stable graph identity, short interruptible camera/layout transitions, overlap handling or routed edges, and reduced-motion support. Avoid continuous forces that make regulatory paths drift while someone reads evidence. A force engine is optional, not a prerequisite for a polished graph.
- Acceptance: arrows remain interpretable during drag/overlap, repeated navigation preserves focus, motion can be reduced, and active pan/drag frame pacing is measured on representative hardware.

### A11. Unsaved profiles are protected on model switching but lost on navigation

- **Confirmed in Chrome:** edit a profile name without saving, then click Source changes in primary navigation. Navigation proceeds with zero confirmation dialogs and the draft is discarded.
- Fix: preserve a recoverable local draft or consistently guard route changes/reloads. Explain whether a draft or saved profile drives relevance. Keep profile data separate from source records.
- Existing strengths: validation, saved-versus-draft separation, concurrent-edit protection, corrupt-profile preservation, serial boundaries, unknown relevance, and model isolation passed the targeted profile rerun.

### A12. Personal cross-reference controls form an incomplete workflow

- **Code inspection:** Link accepts arbitrary nonempty strings, including the current TCDS itself. Existing links display as non-clickable badges. Remove/merge capabilities exist in utilities but are not exposed here, and the page provides no clear validation/success feedback.
- Impact: owners can create a link that appears to do nothing, cannot traverse it, and cannot readily undo it. These are personal notes, not reviewed regulatory edges, but the workflow still needs to work.
- Fix: validate/normalize certificate identifiers, prevent self-links, make destinations navigable, expose removal, handle groups already containing either certificate, and explain unsupported catalog targets.

### A13. Accessibility and context need a dedicated completion pass

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

1. **Correctness and recovery:** A01–A05. Bind every displayed fact/detail to the intended model and exact citation; normalize model navigation; make storage and evidence failures recoverable. Add real transition/failure regressions.
2. **Complete the workflows:** A06–A08, A11–A12. Repair reference traversal, independent loading/retries, bounded cached reads, draft protection and editable personal links. Verify Paths/Evidence list as well as the node map.
3. **Professional graph/accessibility pass:** A09–A10, A13. Readable neighborhoods and family grouping, stable short transitions, overlap-safe edges, reduced motion, keyboard/touch/context clarity. Benchmark active interaction before considering a force engine.
4. **Release confidence:** A14–A15. Reconcile coverage/documentation, make browser checks repeatable, conduct representative user/assistive-technology testing, then return to the existing explicit publication review. Do not expand source scope to avoid addressing these defects.

Before publication, also review source-viewer rate/usage protection and operational budgets: it is a deliberately public endpoint that creates temporary links for published PDFs, with no application-level throttling in the inspected handler. This is a cost/abuse-hardening review item, not evidence that private drafts are accessible. Confirm hosted backups/restore, scheduler failure visibility and production headers when preparing the deployment. These were not tested by mutating infrastructure during this audit.

During the original read-only audit, no application fixes, new aircraft imports, hosted migrations, commits, pushes, or publication were performed. Only its report, memory, and ignored diagnostic scripts/results were written. The subsequent authorized repair phase is tracked near the top of this document.
