# Presenting aircraft regulatory data

The primary entry point is an aircraft model, as selected by the user. Certificate number and manufacturer searches remain available. The website stays unpublished while related-source coverage and the graph are developed and reviewed.

## First working navigation

Search `PA-28-181` → select the Piper PA-28 result → view the selected model's relationships → select a reference → read its evidence and view the cited original PDF. Switch to related records for current-first AD/STC discovery or revision history for all 23 imported TCDS snapshots and comparison.

| Area | What the user gets |
| --- | --- |
| Search | Model/manufacturer/certificate search, readable family cards, selected-model links, explicit empty results |
| Certificate overview | Holder, source status, revision/date, number of covered models, FAA source link |
| Model selector | Chooses the model within a certificate; does not treat every PA-28 variant as interchangeable |
| Relationships | Model-centered graph and an equivalent list; selecting a connection opens the evidence panel |
| Evidence | Exact source snapshot and page, excerpt, amendment/effective date or scope, official link, archived PDF viewer |
| Imported history | Current revision identified by the database pointer, issuance and first-retrieval dates, archival status, every imported source link |
| Related records | AD/STC type, text filter, current-first results, optional history, reviewed-source badges, extracted AD text |
| Aircraft configuration | Named browser profiles, optional serials, reported STC installation, reviewed relevance labels and filters that retain unknowns |
| Regulation originals | Historical CAR scans and 2016 CFR text labeled by edition and completeness |
| Comparison | Two archived revision selections, issuance metadata and PDF byte identity; both originals available |
| Coverage | Reviewed connections distinguished from index candidates; missing amendments, equipment and applicability stated explicitly |
| Browser notes | Existing personal links and prototype history remain labeled as local records |

Desktop keeps evidence beside the diagram so a user can inspect connections without scrolling to the end. Mobile defaults to the list; the graph remains selectable and scrolls within its own container. Native buttons, source links, and the model selector support keyboard navigation.

## Current relationship coverage

Nineteen reviewed connections cover PA-28-140 and PA-28-181: 15 model-to-TCDS/basis references plus a conditional AD connection, two STC scope connections and an AD-to-service-bulletin path. TCDS evidence comes from pages 1, 35 and 36 of revision 66. Review functions require the exact SHA-256 of inspected PDFs; they cannot publish against arbitrary source originals.

The graph distinguishes `covered_by`, `certified_against`, `applies_to`, `approved_for` and `references`, with directed arrows and a matching list. CAR 3 baseline identity is shared, while model-specific amendment scope stays on each relationship. Individual FAR sections include the cited amendment in their identity. Selecting AD 2020-24-05 for PA-28-140 shows conditional serial scope and lets the user expand to the referenced Piper SB 1304A. Approved STC scope does not assert installation. Optional-equipment and serial-specific noise connections remain pending. Other PA-28 models show explicit unreviewed coverage.

A new current TCDS snapshot hides the previous snapshot's graph connections until the evidence is reviewed again. A changed or inactive AD/STC index observation likewise hides the old reviewed current paths. Historical relationships remain stored. CAR baseline and amendment 3-7 originals are available, but do not form the complete cited basis. Seven 2016 CFR sections are labeled as later reference text, distinct from the TCDS's amendment wording and today's regulations.

## Dates and changes

Keep issuance date, historical basis effective date, snapshot first retrieval, and last successful source check distinct. Regulatory dates render in UTC to avoid displaying the preceding date in US time zones. Public freshness exposes only a successful check timestamp; importer errors and internal run records stay private.

A revised document is not automatically an applicable change for every aircraft. Future change summaries must show the actual source difference, affected model/configuration, applicability evidence, and remaining uncertainty. Personal certificate links do not establish regulatory applicability.

## Next data and interface layers

1. Extend the implemented browser profiles with more reviewed configuration conditions; retain explicit unknowns and separate user-reported installation from approval scope.
2. Extend source review to relevant ADs/STCs, AMLs and exact historical amendment wording.
3. Add more graph paths, relationship-type filters and historical relationship exploration.
4. Add actual source-content change summaries and configuration-aware watchlists before scheduled alerts. PDF fingerprint differences alone do not describe changed wording.

Verified on October 14, 2026: 62 frontend tests, 17 worker tests, PostgreSQL importer/dependency/access checks, lint, types and production build passed. Local and hosted Supabase expose 19 reviewed connections. Browser checks cover source exploration, history, profile persistence, reviewed serial boundaries, user-reported installation, filters retaining unknowns, storage failures, model isolation, mobile layout and outage fallback. See [related-source validation](related-sources.md) and [aircraft profiles](aircraft-profiles.md) for scope and remaining coverage.

## Node navigation and review coverage

An additional Nodes view now supports zoom/pan, automatic layout, canonical shared nodes, directed arrows, node/relationship selection, type filters and shared-model comparisons. A keyboard-accessible incident-connection list opens the same exact evidence inspector. The Review coverage tab distinguishes current FAA candidates from reviewed model evidence. The hosted catalog now has 31 graph rows; local schema is updated, while the additional source archive was imported into the hosted catalog only. See [node graph and review](node-graph-and-review.md) for the implemented boundary and validation.
