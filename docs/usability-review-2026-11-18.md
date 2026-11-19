# Usability and accessibility release pass

November 18, 2026. Authorized fixes and verification of the current aircraft-research workflows. The website remains unpublished. This review changes presentation and accessibility semantics, not FAA records, relationship evidence, applicability rules or source monitoring.

## Confirmed issues repaired

| Finding | Repair | Verification |
| --- | --- | --- |
| The search-page “Model-first discovery” caption measured 4.34:1 on its background | Darker slate text | Browser axe scan |
| Aircraft-model kind labels were too dim over parts of the graph gradient/links (sampled 3.84:1 and 4.29:1) | Brighter aircraft-model blue, preserving typed symbols and textual labels | Repeat rendered screenshot sampling |
| Prototype notice sat outside page landmarks | Grouped navigation and global notices in a semantic header | Browser landmark scan |
| Open profile editor jumped from the page h1 to h3 subsections | Added h2 to the configuration disclosure summary | Expanded-editor heading scan |
| Loading-status and other graph/evidence/profile wrappers had names on generic elements | Added group roles; removed the unsupported generic React Flow controls label while retaining each button's own name | Browser ARIA scans and typecheck |

The added `@axe-core/playwright` development dependency makes common accessibility checks part of the existing isolated browser gate. Four accessibility journeys scan nine states in each desktop/mobile project: search, source changes, family map, evidence list, profile editor, related records, Paths, revision history and review coverage. Existing nine functional journeys remain. Total: 26 test cases. No rule exclusions or suppressed violations were needed. JSON attachments retain both violations and incomplete results; an incomplete result is not a pass.

## Verification and practical limits

- Full local check: 192 frontend tests, 53 worker tests, database migration/RLS/source guards, release configuration, lint, types, build and release assets passed. Final presentation/test changes receive an additional lint/types/build and the expanded browser gate.
- Managed Chromium, installed Chrome and installed Edge: all 26 desktop/mobile cases passed in each browser. The final Chrome run also explicitly rejects unresolved prohibited-ARIA results; hosted CI verifies the final tree separately. Consult the selected commit's GitHub quality run.
- Live Chrome context journey: route titles/headings, skip link, keyboard focus, model/filter changes, distinct selected aircraft versus explored source model, Back/list/Paths consistency, 320/390px layout, 200% root-font enlargement and reduced motion passed.
- Live Edge source journey: bounded selected-model reads, family/cache reuse, canonical source traversal, selected cited archived PDF/page, per-section failure/retry and zero page errors passed. Reads used the configured public catalog; no FAA imports or hosted record writes were performed.
- Live Edge graph journey: 17-model/41-path family layout, readable zoom, keyboard highlighting, boundary arrows throughout overlap dragging, stable canvas, reduced motion and touch-emulated page scroll/panning passed. Observed drag sample: 19 frames, median 16.7 ms, p95 16.8 ms. This is one headless sample, not a real-device performance guarantee.
- Six live Chrome views cover the Boeing and Piper source inspector, canvas and connection list. Axe found no definite violations in these views. Many contrast results remain marked incomplete because of gradients, SVG text and content outside the viewport. An additional screenshot analysis sampled 816 visible, unobscured text rectangles at three backdrop points each, after hiding text ink without changing layout. Final sampled ratios met the applicable 4.5:1 normal/3:1 large-text threshold. This is sampled evidence, not a complete rendered-contrast audit: it excludes clipped/covered and disabled text, does not cover every state/hover/zoom, and does not assess all non-text graphical contrast.

Ignored screenshots/diagnostics are under `.artifacts/usability-2026-11-18/`; the repeatable fixture gate is `npm.cmd run test:browser`. Use `BROWSER_CHANNEL=chrome` or `msedge` for installed browsers. [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing) describes the automated/manual boundary; [axe's contrast checks](https://github.com/dequelabs/axe-core/blob/develop/lib/checks/color/color-contrast.json) explain why gradient and occlusion results need further review.

## Human review still needed

The native desktop-control connection was unavailable. No NVDA session, physical touch-device test or installed Chrome/Edge browser-toolbar zoom test was completed. No owner/maintenance-professional feedback has been collected by these scripts.

A follow-up closed part of the zoom gap with `node scripts/browser-zoom-smoke.mjs`: actual bundled Chromium tab zoom at 100%, 200% and 400% passed for search, PA-28, Boeing and Source changes. Browser API readback plus CSS viewport/device-pixel-ratio checks confirmed actual zoom, rather than CSS scaling or pinch emulation. The effective viewport widths were 1424, 712 and 356 CSS pixels, with no page-level horizontal overflow. Profile save and graph/list/camera controls worked at 400%. Physical-surface screenshots avoid the cropped output that CSS-sized screenshots can produce at tab zoom. Initial strict equality rejected floating-point `3.9999999999999996`; the probe now uses a tight numeric tolerance.

The probe uses a fresh, ignored persistent test profile and a local test extension limited to the loopback app origin. It closes that context afterward, never uses the owner's browser profile and does not change the installed browser. Playwright documents that its bundled Chromium supports this extension workflow, whereas installed Chrome/Edge removed the required side-load flags. Those installed-browser manual checks, NVDA and physical devices remain outstanding. See [Playwright extension testing](https://playwright.dev/docs/chrome-extensions) and the [tab zoom API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom).

Use this short review script with a representative user and record outcome, confusion and recovery:

1. Find PA-28-181 from search and explain which aircraft and source revision are selected.
2. Follow a reviewed connection to its cited page, then return to the graph. Explain what the citation establishes and which individual-aircraft conditions remain unknown.
3. Enter an incomplete profile, navigate away and return. Recover the draft, save it and identify which relevance labels changed. Use fictional profile data for this exercise.
4. Open the Boeing family, explore a model/certificate path and retrace it. Distinguish family coverage from reviewed AD/STC coverage.
5. Open Source changes and explain the difference between a source check, a recorded source change and a compliance determination. Identify any health warning without treating it as proof of no FAA changes.

Repeat the core journey using only a keyboard and NVDA. Check heading/landmark navigation, control names/states, dynamic status announcements, graph alternatives and PDF modal focus restoration. In Chrome and Edge, test actual browser zoom at 200% and 400%, including reflow, clipped controls and source-panel scrolling; inspect graph zoom separately. Test the phone workflow on a physical device. Recheck contrast for remaining interactive states and graphical controls before claiming broader accessibility conformance.

Operational release evidence remains separate: confirm the Drive ZIP is cloud-synced, failure notifications actually arrive, provider usage/spending settings are appropriate and a retention cadence is chosen. Website publication still requires the owner's release decision. The future GraphRAG/AI pilot remains planned after the current release-readiness work.
