# Foundation decisions

## Active application

Keep the React/TypeScript/Vite/Tailwind frontend and all three routed pages. The user chose to retain them as a clearly labeled prototype. Default scope is FAA general aviation for owners and maintenance professionals, with future commercial and other aircraft coverage.

Use verified snapshots in `src/data/tcds-samples.json` instead of the conflicting handwritten metadata. Each snapshot retains its FAA URL, retrieval timestamp, product type, models, holder, source status, and revision. Opening a snapshot neither creates a revision nor removes other saved documents.

Browser-local cross-references remain personal links. Their membership does not prove applicability, and differing metadata across related certificates does not imply an error. The former mismatch detector and placeholder polling are archived and no longer execute.

Local revision history remains a prototype persistence mechanism. It is not FAA's full revision history. Equal-timestamp entries retain their insertion order. Existing flat-array revision records can still migrate to the map format.

Issue timelines use explicit creation/resolution timestamps rather than estimating dates from IDs or assigning every resolution to today. Legacy records without timestamps remain visible in current counts but cannot establish historical event dates.

## Cleanup policy

Archive experiments rather than deleting their historical context. `research/legacy/` preserves unused scaffold pages/components, the duplicate Tailwind configuration, the old CSV datasets, inaccurate metadata/URL maps, the speculative scraper project, keyword parsing, page-driven polling, and the certificate-equality detector and its tests. Those tests described the archived experiment and are not part of the active app's test suite.

The original and public CSV copies had identical SHA-256 hashes before moving. Both are preserved in the archive; neither is shipped as current source data.

The FAA feasibility scripts stay in `data-feasibility/`; their browser-helper dependency paths now point to the archived scraper project. The authenticated API probe uses Node's built-in HTTP client and does not require that archive.

Tailwind 4 is integrated through its Vite plugin; CSS scanning is restricted to active source and `index.html`. Old Tailwind/PostCSS configuration is archived. ESLint 9 uses a single flat configuration. The root package is ESM; server-side experiments retain explicit `.cjs` filenames. React Router's declarative routes remain the same after upgrading the dependency. Removed app dependencies served only the unused scaffold or obsolete router typings.

Compatible dependency updates were applied first. Remaining advisories required deliberate lint, styling, and routing upgrades; configurations were migrated and the resulting application is checked again. The lockfile records the resolved versions.

## Verification

`npm run check` is the local quality gate. Production builds include typechecking, and the test runner is restricted to active `src/**/*.test.{ts,tsx}` files. Tests use jsdom and require neither network access nor FAA credentials.

The frontend contains no FAA credentials and does not retrieve authenticated FAA data. Its backend API and worker will be introduced in step 2.

Local Git has been initialized on `main`. No remote, commit, or publication has been created. Generated dependencies, build output, local evidence, and secret files are ignored.

## Step 1 result

Completed October 12, 2026. Lint, application/configuration typechecking, 42 tests across five active test files, and the production build passed. Dependency installation reported zero vulnerabilities for the active root package tree; the archived research project is not included in that result.

The local production browser check passed search, verified Piper details, personal linking without manufactured issues, snapshot reload without deleting stored documents, an unknown TCDS, the change-log page, and a mobile home viewport. It observed no browser runtime errors or external data requests. Screenshots are saved in ignored `.artifacts/foundation/`.

The optional browser check uses installed Chrome at a Windows-specific path and the archived Puppeteer installation. It is not part of `npm run check`; portable end-to-end infrastructure can be added when the API is introduced.
