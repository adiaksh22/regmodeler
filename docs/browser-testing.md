# Browser regression gate

The `browser` job in `.github/workflows/quality.yml` runs on pushes and pull requests alongside the existing `check` job. It uses root dependency `@playwright/test` pinned to 1.65.1 and its matching managed Chromium, with desktop and mobile projects. No research-directory dependencies, Windows executable paths, FAA keys, Supabase credentials or running development server are required.

```powershell
npm.cmd ci
npm.cmd run test:browser:install
npm.cmd run test:browser
```

On Linux, install system browser dependencies with `npx playwright install --with-deps chromium`, as CI does. Playwright builds an isolated production bundle under `.artifacts/browser-dist`, starts its own strict-port server at `http://127.0.0.1:4183`, waits for readiness and stops it after the run. Port 4183 must be free. It does not reuse the developer's port 4173 preview or replace `dist/`.

Installed Google Chrome and Microsoft Edge can run the same projects locally:

```powershell
$env:BROWSER_CHANNEL='msedge' # or chrome
try { npm.cmd run test:browser }
finally { Remove-Item Env:BROWSER_CHANNEL -ErrorAction SilentlyContinue }
```

This uses Playwright's supported browser channels rather than a hard-coded executable path. Omit the variable to use managed Chromium. The mobile project emulates a Chromium touch viewport; it is not an actual-device or Safari test.

## Isolation and evidence boundaries

The browser-test bundle explicitly uses `https://browser-fixture.invalid` and a synthetic public-shaped key. A context-level router supplies synthetic catalog, graph, source-health and viewer responses. Unexpected origins/endpoints are blocked and fail the test. No fallback to live services is allowed. Public fixture APIs are allowlisted, and private profile markers must never appear in their request bodies. Each test gets a fresh browser context and storage.

The 17-model/41-path family fixture exercises canonical shared nodes and graph geometry; its excerpts, engine labels and dates are synthetic test values. It is **not FAA evidence** and is not a source-review manifest. The PDF dialog uses a labeled simulated frame, not an actual archived FAA PDF. API failures, count mismatches and storage faults are intentional test inputs. Release builds reject reserved fixture/test hosts; release asset checks reject the fixture backend in `dist/`.

The gate covers model search, route titles/focus, manual aircraft tabs, revision navigation, family layout and arrow boundaries, aircraft-versus-citation context, bounded/scoped cached reads, independent failure/retry, incomplete-response rejection, draft recovery/saved-only relevance, corrupt-storage preservation, memory-only drafts, personal links/merge/removal/Undo and native PDF-dialog behavior. Test files and configuration are typechecked and linted by `npm run check`.

The gate now has 30 cases: eleven functional journeys and four accessibility journeys in each of two projects. The development-only `@axe-core/playwright` checker scans search, source changes, family map, evidence list, profile editor, related records, Paths, revision history and review coverage. WCAG A/AA tags through 2.2 and axe best-practice rules are checked without exclusions. JSON attachments preserve violations and incomplete results; incomplete gradient/offscreen checks are not counted as passing contrast. See [the November 18 usability pass](usability-review-2026-11-18.md) for findings, repairs, rendered sampling and manual review limits. Consult the selected commit's GitHub Linux quality result rather than treating local success as a hosted CI pass.

## Failures and diagnostics

Retries are disabled. A failure must be investigated, rather than hidden by an automatic rerun. Open `.artifacts/browser-report/index.html` or run `npx playwright show-report .artifacts/browser-report`. Failure screenshots and traces are under `.artifacts/browser-results`. CI uploads these directories as `browser-report`, retained for seven days. Traces contain only the isolated fixture session; do not substitute personal browser profiles or real secrets. New fixtures must preserve that boundary.

The initial fixture lacked CORS exposure for `Content-Range`; the real completeness guard correctly rejected it. The fix exposed the count header instead of disabling validation. Native modal tabbing can yield to browser chrome (`document.body`); the test explicitly verifies background app controls remain inert and cannot receive focus.

## Separate live checks

`node scripts/browser-zoom-smoke.mjs` is a separate configured-app check for actual 100/200/400% tab zoom. Start the normal local app at port 5173 first, or set `SMOKE_BASE_URL` to an explicit loopback URL. The script uses bundled Chromium, a fresh persistent profile and a test extension with only loopback host access; no personal browser or extension installation is used. Zoom API readback and viewport/DPR assertions distinguish actual tab zoom from CSS/root-font/device emulation. It verifies four routes, page reflow, keyboard navigation, profile save and graph controls at400%. Screenshots/reports stay under `.artifacts/browser-zoom/`. This script is not part of the credential-free fixture job and does not replace installed Chrome/Edge toolbar zoom, screen-reader or device review.

The scripts listed in [beta readiness](beta-readiness.md) remain read-only hosted-data checks. They verify current source integration, actual model/source inventories, public database access and cited private-archive viewing. They currently use the older local Puppeteer setup and are not dependencies of the portable gate. Run them deliberately with the normal configured production preview; never point the synthetic Playwright router at a live service.

Passing the deterministic gate does not establish current FAA availability, complete regulatory accuracy, database-policy correctness (covered separately by database tests), complete WCAG conformance, NVDA usability or actual-device behavior. Keep hosted evidence checks and human review in the release decision.

References: [Playwright CI](https://playwright.dev/docs/ci), [managed web server](https://playwright.dev/docs/test-webserver), [API interception](https://playwright.dev/docs/mock), [projects and channels](https://playwright.dev/docs/test-projects).
