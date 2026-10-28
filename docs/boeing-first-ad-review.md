# First reviewed Boeing 737 AD relationship

Reviewed October 27, 2026. This batch adds AD 2021-09-08 to the existing A16WE graph for Models 737-8 and 737-9. The website remains unpublished.

## Source and evidence

- FAA record: [AD 2021-09-08](https://drs.faa.gov/browse/excelExternalWindow/41C8FF5365C3CA82862586C700472297.0001), verified Current with a targeted document-number API call.
- Official original: [86 FR 22860–22862, document 2021-09221](https://www.govinfo.gov/content/pkg/FR-2021-04-30/pdf/2021-09221.pdf).
- SHA-256: `b6fbc4a4d33cadab1c2deb6836fc8b467ce4a2c120c68b33d93c874db25089dc`.
- Physical PDF page 3 (printed 22862) was rendered and visually reviewed for paragraphs (c), (g), (h), (i) and (k).

Paragraph (c) combines a supported model, production line number 7399–8082 inclusive, and an original airworthiness certificate OR original export certificate of airworthiness issued on or before April 9, 2021. Line number is explicitly separate from manufacturer serial number. These are three AND predicates in one applicability group per model. Existing browser profiles do not capture or evaluate Boeing line numbers or original-certificate dates; the tool presents reviewed conditions for human review.

Paragraphs (g)(1) and (g)(2) name the P6 panel assembly including the SPCU mounting tray, and the main instrument panel assembly. Two canonical component identities are shared across both model contexts. Four physical relationships yield six public model-scoped paths. No Boeing service-bulletin dependency is invented: paragraph (k) lists no material incorporated by reference. Attachments remain explicitly pending.

## Execution and safeguards

`npm.cmd run review:boeing -- --verify-only` makes one named AD metadata query and downloads the pinned GovInfo original without database writes. `npm.cmd run review:boeing` additionally archives the original and invokes the service-only review transaction against the configured backend. It does not reconcile the full AD catalog. Model matches must already exist in the imported B737 scope.

The transaction requires exact source URL, PDF hash, final-publication URL/date/kind, publication status, active model index matches and reviewed A16WE model membership. Repeating review does not duplicate relationships or public paths. A missing active model match aborts the whole review. Stale source paths remain hidden by the existing graph view.

The migration and reviewed original are applied to hosted Supabase. Local checks cover provenance guards, active-model boundaries, combined predicates, shared component paths, repeat review and anonymous write denial. Browser smoke verifies both model contexts, evidence selection, official publication links, line/date presentation and mobile width. The next source batch should review one selected 737NG AD and one STC/AML, preserving certificate/model association and source-page evidence.
