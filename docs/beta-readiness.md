# Portfolio beta readiness

Updated November 3, 2026. The website remains unpublished. This report covers automated browser journeys and local quality checks; it is not a completed usability study or accessibility certification.

## Verified journeys

| Journey | Evidence |
| --- | --- |
| Model-first discovery | PA-28-181 search opens the intended model; empty search results can be cleared |
| Keyboard exploration | Aircraft tabs use one Tab stop; Left/Right wrap focus, Home/End reach endpoints, Enter activates a tab without fetching panels while merely moving focus |
| Related sources | Current-first records, history filter, model-scoped reviewed AD evidence, source-status explanations |
| Profiles | Draft/save separation, serial boundaries, user-reported STCs, persistence, separate models, concurrent-edit protection, corrupt-storage preservation and no profile upload |
| Profile relevance | Node-map cards show reviewed relevance labels; profile-filtered related counts distinguish visible records from loaded matches; unknown candidates remain visible |
| Change feed | Named source health, model filtering, correct certificate links, completed revision history |
| Graph interaction | Source details collapse/reopen, Enter/Space explore canvas nodes, and keyboard focus survives neighborhood changes without extra detail requests |
| Graph rendering | Focused directed edges, neighbor/back navigation, overview restoration and mobile evidence round trip; measurement-only events no longer trigger controlled-node update churn |
| Small screens | Home and change-feed layouts fit 320/390px; profile and graph workflows have separate mobile checks |
| Recovery | Unknown routes offer aircraft search; simulated database outage shows labeled snapshots; retry restores hosted relationships and removes outage notices |
| PDF dialog | Native modal makes background controls inert; keyboard stays inside, Escape/Close restore focus, page scrolling is restored, mobile sizing and unavailable-original guidance pass browser checks |

Run `npm.cmd run check` for lint, frontend/worker tests, database migration and access checks, types and production build. Browser checks use the existing isolated Chrome/Puppeteer setup with a production preview on port 4173:

```powershell
node scripts/beta-journey-smoke.cjs
node scripts/profile-smoke.cjs
node scripts/graph-navigation-smoke.cjs
node scripts/network-design-smoke.cjs
node scripts/family-graph-smoke.cjs
node scripts/monitoring-smoke.cjs
node scripts/revision82-smoke.cjs
node scripts/pdf-dialog-smoke.cjs
```

The beta test reads hosted public data and simulates outages only inside its isolated browser. It does not import FAA records, alter hosted data or publish the site. Historical tests elsewhere in `scripts/` may assume earlier catalog inventories; this list identifies current journey checks.

## Release sequence

1. Completed locally: native PDF modal keyboard containment, escape/close behavior, focus restoration, unavailable-original messaging and supported-scope/source-status presentation checks. This does not replace assistive-technology/user testing.
2. Have an owner or maintenance professional try finding a model, following a reviewed connection to its cited page, saving an incomplete profile and interpreting a source-change event. Record confusion rather than treating automated checks as user feedback.
3. Review the prepared [release settings and rollback plan](release-review.md). The guarded `npm run build:release` requires hosted public configuration; backend credentials stay in the worker environment. Deployed deep links and environment settings still need verification after an approved first release.
4. Obtain the user's release decision, then publish and verify the deployed build and supported workflows.

New aircraft/source expansion is deferred until this UI/release phase is complete. The supported deep-profile scope remains PA-28-140/181; Boeing has 17 reviewed family/TCDS identities and seven detailed technical profiles, while 737-10 AD/STC discovery is explicitly unconfigured. The graph is research evidence, not an individual-aircraft compliance determination.
