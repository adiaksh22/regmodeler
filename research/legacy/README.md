# Archived prototype research

This directory is reference material, not a runnable application or a trusted regulatory dataset. It is excluded from the active frontend build and quality checks.

- `src/`: unused scaffold UI, old CSV loaders, speculative parsing/monitoring, handwritten metadata and URL maps, and the certificate-equality experiment.
- `data/original/` and `data/public-copy/`: identical copies of the original 32-row CSV, retained for provenance. Source status/freshness must be revalidated before use.
- `mcp-client/`: the original standalone scraper project, including experimental results. Some results map multiple certificates to the same unrelated document and must not be used as authoritative mappings.
- Old Tailwind, PostCSS, and ESLint configurations: retained for provenance. The active project uses the Tailwind Vite plugin and `eslint.config.js`.

Archived code may contain obsolete imports, invalid scripts, and unverified endpoints. The old mismatch tests compare distinct certificates as if their metadata should match; that assumption is not the planned relationship model.

Current supported FAA API feasibility tooling lives in the root `data-feasibility/` directory. Its optional guest-browser helpers use the archived project's existing Puppeteer installation; the authenticated API probe is independent of it.
