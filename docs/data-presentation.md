# Presenting aircraft regulatory data

The primary entry point is an aircraft model, as selected by the user. Certificate number and manufacturer searches remain available. The website stays unpublished while related-source coverage and the graph are developed and reviewed.

## First working navigation

Search `PA-28-181` → select the Piper PA-28 result → view the selected model's relationships → select a reference → read its TCDS evidence and open the FAA source. Switch to revision history to browse all 23 imported TCDS snapshots.

| Area | What the user gets |
| --- | --- |
| Search | Model/manufacturer/certificate search, readable family cards, selected-model links, explicit empty results |
| Certificate overview | Holder, source status, revision/date, number of covered models, FAA source link |
| Model selector | Chooses the model within a certificate; does not treat every PA-28 variant as interchangeable |
| Relationships | Model-centered graph and an equivalent list; selecting a connection opens the evidence panel |
| Evidence | Exact certificate revision and page, source excerpt, amendment/effective date or scope, FAA source link |
| Imported history | Current revision identified by the database pointer, issuance and first-retrieval dates, archival status, every imported source link |
| Coverage | Reviewed models and pending AD/STC/noise/optional-equipment coverage stated explicitly |
| Browser notes | Existing personal links and prototype history remain labeled as local records |

Desktop keeps evidence beside the diagram so a user can inspect connections without scrolling to the end. Mobile defaults to the list; the graph remains selectable and scrolls within its own container. Native buttons, source links, and the model selector support keyboard navigation.

## Current relationship coverage

Fifteen reviewed connections cover PA-28-140 and PA-28-181: each model links to TCDS 2A13 and its selected CAR 3/FAR Part 23 certification-basis references. Evidence comes from pages 1, 35 and 36 of revision 66. The review function requires the exact SHA-256 of the inspected PDF; it cannot publish against an arbitrary source revision.

The graph distinguishes `covered_by` from `certified_against`. CAR 3 baseline identity is shared, while model-specific amendment scope stays on each relationship. Individual FAR sections include the cited amendment in their identity. Optional-equipment, serial-specific noise, AD and STC connections are not yet asserted. Other PA-28 models show explicit unreviewed coverage.

A new current TCDS snapshot hides the previous snapshot's graph connections until the evidence is reviewed again. The underlying historical relationships remain stored. Full historical regulation text has not been imported; displayed references are supported by the TCDS, and are not represented as today's eCFR wording.

## Dates and changes

Keep issuance date, historical basis effective date, snapshot first retrieval, and last successful source check distinct. Regulatory dates render in UTC to avoid displaying the preceding date in US time zones. Public freshness exposes only a successful check timestamp; importer errors and internal run records stay private.

A revised document is not automatically an applicable change for every aircraft. Future change summaries must show the actual source difference, affected model/configuration, applicability evidence, and remaining uncertainty. Personal certificate links do not establish regulatory applicability.

## Next data and interface layers

1. Add related AD and STC discovery, retaining candidate matches until applicability/approval evidence is reviewed. Include serial ranges and installed equipment where specified.
2. Retrieve amendment-specific regulatory text and historical CAR material. Keep current eCFR text as a separately dated reference.
3. Expand graph traversal to reviewed AD/STC/product connections, with relation-type filters and historical evidence views.
4. Add source-page viewing and revision comparison, then configuration-aware watchlists and alerts.

Verified on October 13, 2026: 53 frontend tests, eight worker tests, PostgreSQL importer/explorer checks, lint, types, production build, and hosted desktop/mobile browser smoke checks passed. Live review published 15 connections in both local and hosted Supabase. The browser checks cover model search, page-specific citations, all 23 imported revisions, unreviewed-model coverage, personal-link preservation, mobile layout, and catalog outage fallback.
