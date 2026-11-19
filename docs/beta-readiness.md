# Portfolio beta readiness

Updated November 16, 2026. The website remains unpublished. This report covers automated browser journeys and local quality checks; it is not a completed usability study or accessibility certification.

## Verified journeys

| Journey | Evidence |
| --- | --- |
| Model-first discovery | PA-28-181 search opens the intended model; empty search results can be cleared |
| Keyboard exploration | Aircraft tabs use one Tab stop; Left/Right wrap focus, Home/End reach endpoints, Enter activates a tab without fetching panels while merely moving focus |
| Route context | Distinct browser titles and completed-page heading focus; model/filter changes retain focus; skip link and unknown-route recovery work |
| Exploration context | Selected aircraft/configuration, family/model scope, explored node and citation model stay distinct, including hidden source details and cross-model family exploration |
| Related sources | Current-first records, history filter, model-scoped reviewed AD evidence, source-status explanations |
| Profiles | Draft/save separation, incomplete draft recovery across routes/reloads/models, blocked-storage fallback, serial boundaries, user-reported STCs, persistence, concurrent-edit protection, corrupt-storage preservation and no profile upload |
| Personal cross-references | Validated identifiers, self/duplicate rejection, navigable destinations, explicit group merging, member removal/Undo, stale-write protection and unsupported destination guidance |
| Profile relevance | Node-map cards show reviewed relevance labels; profile-filtered related counts distinguish visible records from loaded matches; unknown candidates remain visible |
| Change feed | Named source health, model filtering, correct certificate links, completed revision history |
| Graph interaction | Source details collapse/reopen, Enter/Space explore canvas nodes, and keyboard focus survives neighborhood changes without extra detail requests |
| Graph rendering | Focused directed edges, neighbor/back navigation, overview restoration and mobile evidence round trip; measurement-only events no longer trigger controlled-node update churn |
| Graph readability/motion | Responsive family columns and full mobile fit, bounded label scaling, readable zoom, keyboard/hover path highlighting, stable canvas, interruptible 240 ms motion, reduced-motion preferences and overlap-safe dragging |
| Small screens | Home and change-feed layouts fit 320/390px; profile and graph workflows have separate mobile checks |
| Recovery | Unknown routes offer aircraft search; simulated database outage shows labeled snapshots; retry restores hosted relationships and removes outage notices |
| PDF dialog | Native modal makes background controls inert; keyboard stays inside, Escape/Close restore focus, page scrolling is restored, mobile sizing and unavailable-original guidance pass browser checks |
| Archive usage limit | Private shared signing budget, visible 429/retry guidance and temporary button cooldown; official source links remain accessible |

Run `npm.cmd run check` for lint, frontend/worker tests, database migration/access checks, types, build and release assets. The separate **portable browser gate** runs `npm.cmd run test:browser` after `npm.cmd run test:browser:install`: managed server, synthetic fixtures, desktop/mobile Chromium and blocked external traffic. It runs in GitHub's `browser` quality job without FAA/Supabase credentials; see [browser testing](browser-testing.md). Its simulated archive checks dialog behavior rather than the real FAA PDF.

The existing **live integration checks** below use the isolated Chrome/Puppeteer setup with a normally configured production preview on port 4173. They remain separate from the portable gate and test actual hosted/source integration:

```powershell
node scripts/beta-journey-smoke.cjs
node scripts/profile-smoke.cjs
node scripts/personal-workflows-smoke.cjs
node scripts/context-accessibility-smoke.cjs
node scripts/graph-navigation-smoke.cjs
node scripts/network-design-smoke.cjs
node scripts/monitoring-smoke.cjs
node scripts/pdf-dialog-smoke.cjs
node scripts/audit-correctness-smoke.cjs
node scripts/explorer-loading-smoke.cjs
node scripts/source-status-smoke.cjs
node scripts/revision83-smoke.cjs
node scripts/family-graph-smoke.cjs
node scripts/graph-ui-smoke.cjs
```

The beta test reads hosted public data and simulates outages only inside its isolated browser. It does not import FAA records, alter hosted data or publish the site. Historical tests elsewhere in `scripts/` may assume earlier catalog inventories; this list identifies current journey checks.

The audit-correctness journey also verifies all 17 Boeing model summaries, model-bound AD details, explicit evidence failures/retry, NG search aliases, corrupt personal records and denied-storage startup. It supports `SMOKE_BASE_URL` and `SMOKE_BROWSER_EXECUTABLE`; the November 3 repair pass ran it in Windows Chrome and Edge. See [the full audit and repair status](tool-audit-2026-11-03.md) for open findings; earlier journey passes do not close those issues.

The loading journey verifies selected-model queries, explicit family expansion, cache reuse, independent section retries, retained dated data on failed refresh, canonical reference traversal and the real cited archive page. It supports the same base URL/browser overrides. The browser read cache lasts two minutes; it is separate from the scheduled FAA source checks.

The personal-workflows journey and updated profile journey passed in Chrome and Edge. Draft backups are per model and tab; memory-only drafts request a reload warning even away from the editor. Personal linking performs one exact public catalog lookup on a valid submission, with no FAA import. These links remain personal browser records and do not become reviewed regulatory edges. Edge's first memory-fallback run timed out; an isolated rerun passed without a production-code change. This intermittent result remains recorded rather than being treated as proof of flawless browser behavior.

The context/accessibility journey passed in Chrome and Edge: route headings/titles, skip link, filter/model focus preservation, the legacy status select's accessible name and saved update, distinct model/focus/source scopes, hidden-inspector context, Back and list/Paths consistency, 320/390px layouts, 200% root-font enlargement/reflow and reduced CSS motion. It samples text contrast only in the new solid-background context panel. This is not a complete gradient-contrast audit, real browser zoom matrix, actual-device touch test or NVDA review. The visible keyboard/map-control disclosure keeps longer instructions available without filling the mobile view. Existing graph motion/collision and source-navigation regressions remain part of validation.

The graph UI journey verifies the 17-model/41-path family fit and label readability at desktop, tablet and 320/390px widths; all 41 links remain visible during overlap stress. It checks keyboard highlighting, stable canvas identity through navigation, readable zoom/fit, reduced motion and actual mobile touch scrolling. On narrow screens the family map grows vertically to preserve readable labels; Move map and Scroll page distinguish panning from normal page scrolling. Dense all-catalog overviews still benefit from focused exploration. These automated checks do not replace assistive-technology or owner/maintenance-professional feedback.

The November 16 [Revision 83 review](boeing-revision83-review.md) restored 41 current TCDS paths across 17 Boeing models and seven profiles with 49 revision-bound facts. The source guard remains active for future revisions. `family-graph-smoke.cjs` now verifies the reviewed Revision 83 inventory; `revision83-smoke.cjs` verifies current facts and cited PDFs. Both passed in Chrome and Edge. `revision82-smoke.cjs` remains a historical check.

## Release sequence

The [November 18 usability/accessibility pass](usability-review-2026-11-18.md) repaired confirmed contrast, landmark, heading and accessible-name defects and expanded the portable gate to 26 cases. Rendered gradient sampling and live Chrome/Edge journeys supplement the fixtures. NVDA, physical devices, actual browser zoom and representative user feedback remain explicit human-review items.

1. Completed locally: native PDF modal keyboard containment, escape/close behavior, focus restoration, unavailable-original messaging and supported-scope/source-status presentation checks. This does not replace assistive-technology/user testing.
2. Route/title/focus/context repairs (A13), profile/link repairs (A11/A12) and portable browser CI (A15) are implemented. Complete remaining assistive-technology/user validation. Have an owner or maintenance professional try finding a model, following a reviewed connection to its cited page, recovering an incomplete profile and interpreting a source-change event. Record confusion rather than treating automated checks as user feedback.
3. Review [operating safeguards](release-operations.md) and [release/rollback settings](release-review.md): the shared signing budget and real local application/archive restore drill are verified. Off-site backup/retention, provider usage/spending controls and notification delivery still need confirmation. The guarded `npm run build:release` validates hosted public configuration and assets/headers; backend credentials stay in the worker environment. Deployed headers/deep links/settings still need verification after an approved first release.
4. Obtain the user's release decision, then publish and verify the deployed build and supported workflows.

New aircraft expansion is deferred until this UI/release phase is complete. The reviewed Revision 83 Boeing network is restored with 17 model identities, 41 TCDS paths and seven detailed technical profiles; 737-10 AD/STC discovery remains explicitly unconfigured. Browser configuration profiles support PA-28-140/181. The graph is research evidence, not an individual-aircraft compliance determination.
