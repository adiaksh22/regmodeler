# Release operations review

Reviewed November 16, 2026. The website remains unpublished. Repository checks and read-only service observations below do not establish that uninspected provider/account settings are configured.

| Area | Evidence/status | Before publication |
| --- | --- | --- |
| Source scheduling | `SOURCE_CHECKS_ENABLED=true`; daily/weekly jobs enabled, independent source steps, shared concurrency lock and bounded job timeouts | Keep an operational owner and inspect scheduled failures; GitHub scheduled start times are not an availability guarantee |
| Recent workflow results | [Daily November 16](https://github.com/adiaksh22/regmodeler/actions/runs/43974228352) and [weekly November 15](https://github.com/adiaksh22/regmodeler/actions/runs/43752567091) succeeded | Recheck at release time |
| Public freshness | Read-only `source_monitoring_coverage` returned six successful, baseline-ready source groups on November 16; TCDS/AD/STC PA-28 and Boeing checks had last successes around 22:54–22:56 UTC | Preserve per-source last-success versus last-attempt semantics; a job success does not prove complete FAA coverage |
| Failure visibility | Worker tests cover sanitized failed-attempt persistence and unchanged checkpoints; UI distinguishes stale/failed/not-established states | Verify maintainer notification delivery/account preferences; no email/Slack notification was sent or configured during this review |
| Browser gate | Managed desktop/mobile Chromium, blocked external traffic, isolated fixture build and failure diagnostics; no production secrets | Require both quality jobs to pass. Branch/ruleset enforcement has not been verified |
| Private originals | Viewer signs only published FAA originals/attachments bound to exact hash and parent; five-minute expiry, 4 KiB request bound, method/ID validation and no-store replies are tested | Preserve publication and archive checks; PDFs already signed can remain accessible until their URL expires |
| Public viewer usage | Signing endpoint is deliberately public; no application-level distributed rate limit was found | Establish provider/gateway rate/usage protection and monitor function/storage egress budgets before public traffic. CORS and signed-URL expiry do not prevent repeated signing/downloads |
| Database recovery | Local migration/idempotence/RLS tests pass; this verifies reconstruction of schema/test data | Confirm the project's actual backup/export retention and access, plus a restore drill into an isolated database including object-storage originals and service configuration. No hosted backup or restore was performed |
| Static response policy | `public/_headers` packages nosniff, no-referrer, anti-framing, limited CSP directives and disabled unused device permissions | Verify actual Cloudflare responses on direct routes and assets after approved deployment; Vite preview does not apply Pages `_headers` |
| Deployment/recovery | Guarded release configuration, `dist/` asset checks, SPA entry and rollback instructions | Record exact commit, both job results, provider settings and first deployment URL; exercise deployed deep links/PDF/retry. First release has no previous production build to roll back to |

## Scope of the response policy

[Cloudflare Pages parses `_headers`](https://developers.cloudflare.com/pages/configuration/headers/) for static responses. The committed policy prevents embedding this application, disallows object plugins and restricts base URLs. It does **not** enforce a complete script/connect/style allowlist. React Flow uses dynamic inline styles and the viewer embeds a separate Supabase origin; a stricter policy needs a tested origin/style plan. The policy does not configure the separate Supabase function or storage responses. Existing PDF viewing uses an iframe, not an object plugin, and remains independently tested.

Release asset validation checks that `_headers` survives the build, the SPA entry exists, no top-level `404.html` disables the intended Pages fallback, and the isolated browser-fixture backend is absent from normal assets. This is packaging evidence, not deployed-header evidence. See [Pages SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering).

## Dependency check

The dependency pass updated `fast-xml-parser` to the patched 5.12.1 line and applied compatible lockfile updates for development-tool advisories. The initial runtime advisory affected non-default stop-node parsing; this project does not enable that option. See [the upstream advisory](https://github.com/advisories/GHSA-474x-hrwr-fgx4). The final `npm audit` returned zero known advisories at review time. This result is time-bound; repeat the audit before release and do not use a force/major upgrade without checking compatibility.

## Remaining release evidence

The concrete remaining items are owner/maintenance-user feedback; NVDA and actual-device/browser-zoom/complete rendered-contrast review; viewer usage protection; verified notification delivery; backup/restore evidence; and the user's publication decision. Do not describe these as completed because automated tests pass. This phase changed repository configuration and dependencies only: no hosted schema/source/secret changes, deployment, paid subscription or notification setup.
