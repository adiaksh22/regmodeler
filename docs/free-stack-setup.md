# Free portfolio infrastructure

Chosen October 12, 2026: Cloudflare Pages for the website, Supabase Free for PostgreSQL/Auth/Storage/Data API, and GitHub Actions for checks and future scheduled imports. Student benefits are optional; normal free accounts can be used immediately.

## What is implemented

- PostgreSQL migrations for documents, version snapshots, model/provision/certificate entities, evidenced relationships, private watchlists, importer runs, and checkpoints.
- A published TCDS catalog view and bounded search RPC exposed through Supabase's Data API.
- Public readers cannot edit source records; unreviewed/draft relationships are hidden; private watchlists belong to the authenticated owner.
- Original source files have a private storage bucket. A viewer/download mechanism can be added later without making every file public.
- The frontend reads the shared catalog when configured, uses verified bundled snapshots when unconfigured, and labels fallback after an API failure.
- Build-time rejection of server credentials in browser variables.
- A server-only worker connectivity check and a manual GitHub Actions workflow. Scheduled FAA imports are not enabled yet.

The app remains a prototype. Accounts/watchlist UI is step 7; the database permissions are prepared now. Step 3 has validated first and repeated live PA-28 TCDS imports with 23 revisions. The other two catalog entries remain verified seed snapshots; related AD/STC/regulation imports and automatic scheduling are still planned.

## Run locally

Install/start Docker Desktop. From the project directory:

```powershell
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:env
npm.cmd run dev
```

The database/API/Auth/Storage run locally. Optional dashboard/realtime/edge-function services are excluded to reduce resource use. `db:env` creates an ignored `.env.local` from local status without printing credentials; it refuses to overwrite an existing file or target a remote project.

Run `npm.cmd run db:stop` when finished. Do not reset a local database containing work you want to keep. On this first setup the three records came from `supabase/seed.sql`, generated using `node scripts/generate-seed.mjs`.

## Checks

```powershell
npm.cmd run check
npm.cmd run api:test
npm.cmd run worker:check
```

`check` includes frontend tests/types/lint/build and embedded PostgreSQL migration/RLS tests; no Docker/cloud credentials are needed for that database check. `api:test` requires the local stack and `.env.local`, refuses remote URLs, tests real HTTP/Auth/Storage behavior, and removes its temporary fixtures. `worker:check` checks importer-schema access without importing records or claiming source freshness.

The public API contracts are documented in `src/lib/database.types.ts`. Keep that contract synchronized with the SQL view/RPC when adding fields.

### Local validation result

Verified October 12, 2026: 50 frontend tests, lint, application/configuration types, production build, and embedded PostgreSQL migrations/RLS checks passed. The final migrations also applied successfully to the local Supabase/PostgreSQL stack. HTTP/Auth/Storage checks confirmed public catalog reads, denied anonymous source writes, hidden drafts/importer state, owner-only watchlists, and private source-file access. The worker health check passed. The production browser check confirmed shared-catalog reads and a labeled bundled fallback during a simulated database outage. The local server secret was absent from the generated browser bundle. Production dependencies reported zero audit vulnerabilities.

The user created the GitHub repository, Supabase project, and Cloudflare account. Local `main` tracks the existing repository history. The hosted database is linked and initialized. The website has not been deployed.

## Your project connections

- GitHub: [adiaksh22/regmodeler](https://github.com/adiaksh22/regmodeler).
- Supabase URL: `https://rmviosdekduffvzfbhnk.supabase.co`.
- Supabase project reference: `rmviosdekduffvzfbhnk`.
- Hosted setup verified October 13, 2026: both migrations applied and the three verified TCDS snapshots seeded. Public API catalog reads and model search passed; anonymous source writes and importer-state reads were denied.
- Ignored `.env.production.local` contains only the hosted public URL and publishable key. Production builds use these settings; `.env.local` still targets local Supabase for development. No hosted server secret was saved.

## Create your accounts

1. GitHub repository created; the workspace is connected. Include source/configuration/docs, but exclude `.env*`, credentials, raw local evidence, dependencies, and generated output. `.gitignore` is already configured.
2. Supabase project created, CLI authenticated, and schema initialized. Keep the database password and server secret private.
3. Cloudflare account created. A paid domain is optional; Pages supplies a project URL. Connect the GitHub repository when ready to publish.

The repository and project URLs have been supplied. Do not send server keys or passwords.

## Configure Supabase after the local schema review

Use the Supabase CLI to log in and link to the project you created:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref rmviosdekduffvzfbhnk
npx.cmd supabase db push
```

`db push` changes the linked hosted database, so verify the intended project before running it. The migrations create tables, access policies, views/functions, and the private source bucket. The initial hosted setup used `db push --linked --include-seed --skip-vault --yes` after a dry run. The three sample records are already seeded; this is not a live FAA import. Future migrations should normally omit `--include-seed` to avoid replacing current-version pointers with the development snapshots.

The initial schema and importer migrations are applied to both local and hosted databases. No credit card, paid plan, or paid compute is required for the chosen portfolio setup.

## Configure Cloudflare Pages

Connect your repository and select these build settings:

In Cloudflare, open **Workers & Pages**, select **Create application**, choose **Pages**, and import the existing GitHub repository `adiaksh22/regmodeler`. Use `main` as the production branch. These steps are documented in [Cloudflare's React deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/). Review the build settings before deploying; the current app is a three-sample prototype and live imports, the relationship graph, and alerts are still planned work.

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `24` |
| `VITE_SUPABASE_URL` | Hosted Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase **publishable** key (or legacy **anon** key) |

The two public Supabase values are already saved in your ignored `.env.production.local`; copy them directly into the Cloudflare build environment when ready. The file is not uploaded to GitHub, so Cloudflare needs those values configured separately.

Set only the public URL/key in Cloudflare's frontend build environment. Leaving both blank deploys the bundled demo. Never set `SUPABASE_SECRET_KEY` or `FAA_DRS_API_KEY` with a `VITE_` prefix. The build rejects unexpected public variables and privileged keys before bundling. The server secret must never be added to Cloudflare's frontend build configuration.

Pages serves the React application and its client routes. Its default SPA behavior applies because the project does not ship a top-level `404.html`.

## Configure GitHub Actions

`quality.yml` runs app and database checks on pushes/pull requests. It uses no credentials. `worker-check.yml` is manual and requires repository Actions secrets named:

- `SUPABASE_URL`: hosted project URL.
- `SUPABASE_SECRET_KEY`: Supabase server secret/service-role key.

In step 3 the import workflow will additionally use `FAA_DRS_API_KEY`. Enter secret values directly in GitHub's repository settings; keep them out of chat, source files, and logs. Cloudflare builds use a different, public key.

## Free-tier operating constraints

Start with a small reviewed general-aviation catalog and related documents, rather than importing the entire FAA archive. Keep PDF files out of PostgreSQL; store metadata/text there and original bytes in Storage. Measure database/file/transfer use before widening coverage.

Supabase Free currently includes 500 MB database storage and 1 GB file storage, may pause inactive projects, and does not include automatic database backups. Keep reviewed exports and source copies separately. GitHub scheduled jobs can be delayed/skipped and disable after 60 days without repository activity. Show last successful retrieval dates, and retain the demo fallback; this setup does not promise continuous safety-critical monitoring.

References: [Supabase Free](https://supabase.com/pricing), [Cloudflare Pages](https://developers.cloudflare.com/pages/functions/pricing/), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
