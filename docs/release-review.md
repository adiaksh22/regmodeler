# Portfolio beta release review

Prepared November 3, 2026. **No deployment has been created by this work.** The publishing decision is pending user review.

## Proposed release

RegModeler is a research prototype for finding FAA aircraft evidence and following cited connections. The beta includes model-first search, a directed node graph, page-cited source viewing, current/history AD/STC discovery, browser-private aircraft profiles and a source-change feed.

Deep profile support covers PA-28-140 and PA-28-181. The Boeing slice includes 17 reviewed family/TCDS identities and seven detailed technical profiles; 737-10 AD/STC discovery remains unconfigured. Reviewed evidence, metadata candidates and unknown applicability must remain visibly distinct. The beta does not determine compliance or promise complete regulatory coverage or uninterrupted alerts.

## Proposed Cloudflare Pages settings

| Setting | Proposed value |
| --- | --- |
| Repository | `adiaksh22/regmodeler` |
| Project name | `regmodeler` if available; availability has not been checked |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build:release` |
| Output directory | `dist` |
| `NODE_VERSION` | `24` |
| `VITE_SUPABASE_URL` | `https://rmviosdekduffvzfbhnk.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Existing public publishable/anon key; copy directly from ignored production configuration |
| Initial address | Cloudflare-provided `pages.dev` address; custom domain can follow |

The [Cloudflare React guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) specifies a repository build and `dist` output. This project's release command wraps its existing build with an additional check: missing configuration and loopback/local URLs are rejected. Existing credential validation also rejects privileged keys. Regular `npm run build` remains usable for CI/demo verification.

Do not put FAA keys or Supabase server credentials in frontend build settings. Do not copy `.env.local`, source archives, research files or the repository root into the deployment: Pages publishes `dist` only. The public key does not bypass database access policies.

Creating a Git-connected Pages project and completing its first deployment publishes a reachable site. Stop before the first deploy until the user approves this release. Git-connected production builds can run on future pushes; [branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/) allow disabling automatic production deployments. Initially keep production deployment deliberate so quality checks and review precede releases.

## Verification before approval

```powershell
npm.cmd run check
npm.cmd run build:release
npm.cmd run preview -- --host 127.0.0.1 --port 4173
```

Then run the browser journeys listed in [beta readiness](beta-readiness.md), including `node scripts/pdf-dialog-smoke.cjs`. The dialog smoke test intercepts a viewer response for keyboard testing; the Revision 82 check independently opens the actual archived PDF at its cited page.

The repository intentionally has no top-level `404.html`. Cloudflare's [SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering) serves the application for client routes. After deployment, verify direct navigation and refresh at `/tcds/2A13?model=PA-28-181`, `/tcds/A16WE?model=737-10`, `/changelog`, and an unknown route. Confirm that hosted data loads, mobile navigation fits, PDFs open, errors are labeled, and retry restores data.

Record the approved Git commit, GitHub quality run, deployment ID/URL, and actual production build settings. Local preview verifies the app; the deployed checks are still required to verify Cloudflare routing and the configured environment.

## Recovery

For later releases, select a previously successful **production** deployment in Pages and use its rollback action. Preview deployments are not rollback targets. See [Cloudflare rollback documentation](https://developers.cloudflare.com/pages/configuration/rollbacks/). The first publication has no earlier production release to restore.

A frontend rollback does not roll back database migrations, source observations or browser profile edits. This release changes no hosted schema or source inventory. Re-run the model, graph, PDF and change-feed checks after rollback. Keep automatic production deployment disabled during an incident so another push does not replace the selected recovery build.

## Remaining review

The user requested a reference-inspired network redesign before publication; its visual review now takes priority. Automated beta, radial graph workspace and native PDF-dialog checks are complete locally. Representative owner/maintenance feedback and the user's final supported-scope/publishing decision remain outstanding. No paid plan, new source expansion or account system is required to review this build.
