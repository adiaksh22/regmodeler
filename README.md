# RegModeler

Aircraft regulatory exploration for owners and maintenance professionals. The first release focuses on FAA general aviation data; the planned data model will support commercial aircraft, other product categories, and additional authorities.

The current app is a prototype with model-first search, TCDS detail, and change-log pages. It reads the shared Supabase catalog or displays three verified demo snapshots. PA-28 details connect 23 imported TCDS revisions and 19 reviewed relationships for PA-28-140 and PA-28-181. Related AD/STC records show current FAA status first with an optional history filter. The graph supports source traversal, cited-page PDF viewing, historical CAR originals, and separately labeled 2016 CFR reference text. Archived revisions can be compared by metadata and PDF fingerprints. Full historical amendment wording, equipment coverage, and individual-aircraft applicability remain incomplete. Automatic imports are not enabled yet. Personal cross-references and browser-recorded prototype history remain local.

## Local development

Use Node.js 24 (see `.nvmrc`); the supported minimum is Node.js 22.12. Run commands from this project directory. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

```powershell
Set-Location C:\Users\adiak\RegModeler
npm.cmd ci
npm.cmd run dev
```

Vite prints the local URL. Open it to browse the prototype.

## Checks

```powershell
npm.cmd run check
```

This runs linting, frontend tests, embedded PostgreSQL schema/access tests, typechecking, and the production build. Individual commands are available:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Check application and build/test configuration types |
| `npm run lint` | Lint active TypeScript and React code |
| `npm test` | Run the tests once, without network access or FAA credentials |
| `npm run test:watch` | Watch tests during development |
| `npm run build` | Typecheck and build to `dist/` |
| `npm run preview` | Serve an existing production build locally |
| `npm run db:start` | Start local Supabase with Docker |
| `npm run db:env` | Generate ignored local configuration without printing keys |
| `npm run db:test` | Test schema and access policies without Docker |
| `npm run api:test` | Test local HTTP/Auth/Storage behavior with Docker |
| `npm run worker:check` | Check server-only importer connectivity |
| `npm run import:verify` | Verify live PA-28 TCDS metadata and incremental filtering |
| `npm run import:tcds` | Archive and import PA-28 TCDS revisions to the configured database |
| `npm run import:related:verify` | Verify scoped AD/STC/CAR pagination and incremental filtering |
| `npm run import:related` | Archive scoped FAA metadata and reconcile model matches |
| `npm run import:reference` | Import seven dated 2016 GovInfo Part 23 reference sections |
| `npm run review:pa28` | Archive the exact reviewed originals and publish their guarded connections |
| `npm run worker:test` | Test the importer offline |

## Workspace layout

```text
src/                 Active frontend and unit/integration tests
  data/              Small verified FAA sample snapshots
  components/        Shared interface components
  pages/             Search, TCDS detail, change log
  types/             Prototype TypeScript contracts
  utils/             Browser-local prototype storage and revisions
docs/                Project plan, foundation decisions, storage documentation
supabase/            Database migrations, private storage setup, local seed
apps/worker/         Server-only FAA/GovInfo import and source-review jobs
.github/workflows/   Quality checks and manual import/connection jobs
data-feasibility/    Reproducible data-access probes and local evidence
research/legacy/     Archived experiments, obsolete UI, and original datasets
public/              Public frontend assets (no credentials or raw research data)
```

Archived research is not compiled, linted, served, or executed by the app. Evidence files and installed dependencies are ignored by Git. The supported FAA API probe remains at its original path so existing instructions still work.

Local `main` tracks [adiaksh22/regmodeler](https://github.com/adiaksh22/regmodeler) and preserves the repository's initial README commit. For a record of the cleanup and validation, see [foundation decisions](docs/foundation.md).

## FAA credentials

The frontend does not need an FAA key. It accepts only `VITE_SUPABASE_URL` and a public `VITE_SUPABASE_PUBLISHABLE_KEY`; leave both blank for demo mode. Never put an FAA or Supabase server key in a `VITE_*` variable or a file under `src/` or `public/`. The build rejects privileged public configuration before generating a bundle.

The feasibility probe reads `FAA_DRS_API_KEY` from its process environment. It does not print or save the key and does not load `.env` automatically. The worker reads server configuration from the process environment or ignored `.env.local`. `.env.example` documents the separate public and private variables.

```powershell
$drsKey = Read-Host "Paste your FAA DRS API key" -AsSecureString
try {
    $env:FAA_DRS_API_KEY = [System.Net.NetworkCredential]::new("", $drsKey).Password
    node data-feasibility/api-key-probe.cjs
}
finally {
    Remove-Item Env:FAA_DRS_API_KEY -ErrorAction SilentlyContinue
    Remove-Variable drsKey -ErrorAction SilentlyContinue
}
```

## Next steps

See [the free-stack setup guide](docs/free-stack-setup.md), [the implementation plan](docs/project-plan.md), [foundation decisions](docs/foundation.md), and [the data feasibility report](data-feasibility/REPORT.txt). Local and hosted Supabase contain the reviewed PA-28 sources. Production configuration is saved locally in ignored `.env.production.local`; development still uses the local stack. The website has not been deployed. Student-pack approval is not required to use the normal free accounts.

Piper PA-28 is the first supported live TCDS import. See [PA-28 ingestion](docs/pa28-ingestion.md) for its source contract, archival behavior, configuration, and validation results. Publication waits until live imports and the relationship graph are ready.

See [data presentation](docs/data-presentation.md) for the implemented navigation, evidence and date semantics, coverage, and next source connections. Try searching `PA-28-181` locally, open its result, and select a graph connection or the imported revision history tab.

See [related-source validation](docs/related-sources.md) for the AD/STC/CAR source contracts, reviewed-original identities, and source-viewer setup. The next selected phase is aircraft configuration profiles before automatic change tracking.
