# Release operations review

Reviewed November 16, 2026. The website remains unpublished. Repository checks and read-only service observations below do not establish that uninspected provider/account settings are configured.

| Area | Evidence/status | Before publication |
| --- | --- | --- |
| Source scheduling | `SOURCE_CHECKS_ENABLED=true`; daily/weekly jobs enabled, independent source steps, shared concurrency lock and bounded job timeouts | Keep an operational owner and inspect scheduled failures; GitHub scheduled start times are not an availability guarantee |
| Recent workflow results | [Daily November 16](https://github.com/adiaksh22/regmodeler/actions/runs/43974228352) and [weekly November 15](https://github.com/adiaksh22/regmodeler/actions/runs/43752567091) succeeded | Recheck at release time |
| Public freshness | Read-only `source_monitoring_coverage` returned six successful, baseline-ready source groups on November 16; TCDS/AD/STC PA-28 and Boeing checks had last successes around 22:54–22:56 UTC | Preserve per-source last-success versus last-attempt semantics; a job success does not prove complete FAA coverage |
| Failure visibility | Sanitized failed attempts/checkpoints and UI health remain tested; daily/weekly workflows now append explicit success/failure/cancelled summaries | Verify maintainer notification delivery/account preferences; no test email/Slack message was sent |
| Browser gate | Managed desktop/mobile Chromium, blocked external traffic, isolated fixture build and failure diagnostics; no production secrets | Require both quality jobs to pass. Branch/ruleset enforcement has not been verified |
| Private originals | Viewer signs only published FAA originals/attachments bound to exact hash and parent; five-minute expiry, 4 KiB request bound, method/ID validation and no-store replies are tested | Preserve publication and archive checks; PDFs already signed can remain accessible until their URL expires |
| Public viewer usage | Deployed private shared PostgreSQL budget: 60 signing attempts/minute, user-selected 1,000/UTC-day; fail-closed, visible 429/retry and preserved source guards | Monitor function/storage budgets separately. This caps signing attempts, not invocation charges or bandwidth from reused signed links. See [viewer control](viewer-usage.md) |
| Database recovery | Actual local export/drill: 23 tables, 18,558 rows, 4,250 archived objects, all foreign keys and 136 referenced originals checked; both regulatory graphs reproduced | Select/verify a private off-site copy and retention cadence. Hosted provider/Auth/Storage-service recovery/settings are not simulated; see [backup recovery](backup-recovery.md) |
| Static response policy | `public/_headers` packages nosniff, no-referrer, anti-framing, limited CSP directives and disabled unused device permissions | Verify actual Cloudflare responses on direct routes and assets after approved deployment; Vite preview does not apply Pages `_headers` |
| Deployment/recovery | Guarded release configuration, `dist/` asset checks, SPA entry and rollback instructions | Record exact commit, both job results, provider settings and first deployment URL; exercise deployed deep links/PDF/retry. First release has no previous production build to roll back to |

## Scope of the response policy

[Cloudflare Pages parses `_headers`](https://developers.cloudflare.com/pages/configuration/headers/) for static responses. The committed policy prevents embedding this application, disallows object plugins and restricts base URLs. It does **not** enforce a complete script/connect/style allowlist. React Flow uses dynamic inline styles and the viewer embeds a separate Supabase origin; a stricter policy needs a tested origin/style plan. The policy does not configure the separate Supabase function or storage responses. Existing PDF viewing uses an iframe, not an object plugin, and remains independently tested.

Release asset validation checks that `_headers` survives the build, the SPA entry exists, no top-level `404.html` disables the intended Pages fallback, and the isolated browser-fixture backend is absent from normal assets. This is packaging evidence, not deployed-header evidence. See [Pages SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering).

## Dependency check

The dependency pass updated `fast-xml-parser` to the patched 5.12.1 line and applied compatible lockfile updates for development-tool advisories. The initial runtime advisory affected non-default stop-node parsing; this project does not enable that option. See [the upstream advisory](https://github.com/advisories/GHSA-474x-hrwr-fgx4). The final `npm audit` returned zero known advisories at review time. This result is time-bound; repeat the audit before release and do not use a force/major upgrade without checking compatibility.

## Remaining release evidence

The concrete remaining items are owner/maintenance-user feedback; NVDA and actual-device/browser-zoom/complete rendered-contrast review; provider usage/spending review; verified notification delivery; confirmation that the verified Google Drive folder ZIP finished cloud syncing and a backup retention cadence; and the user's publication decision. The application recovery drill and shared signing budget are now verified, within their documented boundaries. No website was published or paid subscription changed. This follow-up applied only the viewer-budget migration and updated the existing source-viewer function; source evidence and review relationships were unchanged.

For notifications, the owner should review [GitHub Actions notification settings](https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications) and enable the desired failure notifications, then verify delivery on a real failed run. Workflow summaries are useful diagnostics but do not prove an email reached the owner. This work did not send a test message or alter account notification preferences.

Owner setup: open <https://github.com/settings/notifications>, find **System → Actions**, enable **Email**, select **Only notify for failed workflows**, and save. Ensure the RegModeler repository is watched and the account's notification email is verified and accessible. GitHub's scheduled-run notification routing can depend on the workflow actor; account settings alone do not prove every scheduled failure reaches the intended maintainer. Verify delivery on the next real failure and inspect its Actions summary. No test email was sent.
