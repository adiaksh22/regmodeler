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

The hosted graph contains 136 model-scoped rows for PA-28-140 and PA-28-181, including 36 reviewed model-to-AD/STC connections. The remainder represent TCDS/certification-basis connections and reviewed paths from source documents to components, prior ADs, STCs, AMLs and service documents. TCDS evidence comes from pages 1, 35 and 36 of revision 66. Review functions require the exact SHA-256 of inspected PDFs; they cannot publish against arbitrary source originals.

The graph distinguishes `covered_by`, `certified_against`, `applies_to`, `approved_for`, `affects_component`, `references` and `supersedes`, with directed arrows and a matching list. CAR 3 baseline identity is shared, while model-specific amendment scope stays on each relationship. Individual FAR sections include the cited amendment in their identity. Selecting AD 2020-24-05 for PA-28-140 shows conditional serial scope and lets the user expand to the referenced Piper SB 1304A. Installed-equipment ADs traverse through canonical component nodes, so a Garmin or vacuum-pump identity can be shared across both supported models. Approved STC scope and user-reported equipment do not establish installation or compliance. Optional-equipment and serial-specific noise connections remain pending. Other PA-28 models show explicit unreviewed coverage.

The A16WE expansion adds `member_of` and `powered_by` paths for six reviewed Boeing 737 variants. A family summary presents page-cited engine, weight, capacity, speed, crew and altitude facts while preserving exit-configuration conditions. The 737 MAX 10 appears only as a certification-project boundary because it is absent from current Revision 81. See [Boeing 737 family review](boeing-737-family-review.md).

A new current TCDS snapshot hides the previous snapshot's graph connections until the evidence is reviewed again. A changed or inactive AD/STC index observation likewise hides the old reviewed current paths. Historical relationships remain stored. CAR baseline and amendment 3-7 originals are available, but do not form the complete cited basis. Seven 2016 CFR sections are labeled as later reference text, distinct from the TCDS's amendment wording and today's regulations.

## Evidence review labels

Review coverage, related records and graph evidence share consistent source labels:

| Label | Meaning |
| --- | --- |
| Metadata candidate | FAA model-index match; original conditions have not established a reviewed connection |
| Reviewed connection | Cited evidence supports a model connection within its stated limits; no individual-aircraft compliance determination |
| Review deferred | Source question or missing evidence prevents a reviewed graph connection |
| Excluded from reviewed graph | Observation excluded during review; this does not establish individual-aircraft inapplicability |
| Incomplete original | Missing source material; existing reviewed paths remain limited to available cited pages |
| Record identity mismatch | FAA index identity and delivered document differ; no equivalence inferred |

Review state and source limitations are independent: SA01635LA has reviewed page-supported connections and an incomplete original; SA04009NY remains deferred with a record identity mismatch. FAA current status, a saved primary PDF and retrieval of additional files are shown separately. The expandable label guide explains these distinctions. Compact curated flags accompany each bounded page; detailed notes and separate reviewed-source links load only when selected. Public flags require published parent/source versions and an exact model match, and never include private operator notes.

Variant summaries expose their actual evidence revision and whether it matches the imported current document pointer. They do not hard-code a reviewed revision as current. Earlier reviewed facts require renewed review before representing current limits; the MAX 10 boundary is explicitly scoped to its reviewed source.

## Dates and changes

Keep issuance date, historical basis effective date, snapshot first retrieval, and last successful source check distinct. Regulatory dates render in UTC to avoid displaying the preceding date in US time zones. Public freshness exposes only a successful check timestamp; importer errors and internal run records stay private.

A revised document is not automatically an applicable change for every aircraft. Future change summaries must show the actual source difference, affected model/configuration, applicability evidence, and remaining uncertainty. Personal certificate links do not establish regulatory applicability.

## Next data and interface layers

1. Extend the implemented browser profiles with more reviewed configuration conditions; retain explicit unknowns and separate user-reported installation from approval scope.
2. Extend source review to relevant ADs/STCs, AMLs and exact historical amendment wording.
3. Add more graph paths, relationship-type filters and historical relationship exploration.
4. Add actual source-content change summaries and configuration-aware watchlists before scheduled alerts. PDF fingerprint differences alone do not describe changed wording.

Validation covers frontend and worker tests, PostgreSQL importer/dependency/access checks, lint, types and the production build. Local and hosted schemas expose the same guarded installed-equipment review transaction. Browser checks cover source exploration, history, profile persistence, reviewed serial boundaries, user-reported STC/equipment installation, filters retaining unknowns, storage failures, model isolation, mobile layout and outage fallback. See [related-source validation](related-sources.md), [aircraft profiles](aircraft-profiles.md) and [installed-equipment review](pa28-installed-equipment-review.md) for scope and remaining coverage.

## Node navigation and review coverage

The default desktop node-link map supports zoom/pan, automatic layout, semantic node colors, canonical shared nodes, labeled directed arrows, direct-neighbor focus, node/relationship selection, type filters and shared-model comparisons. A keyboard-accessible incident-connection list opens the same exact evidence inspector. The Review coverage tab distinguishes current FAA candidates from reviewed model evidence. The hosted catalog has 136 PA-28 model-scoped rows plus 18 reviewed A16WE family paths. See [node graph and review](node-graph-and-review.md) for the implemented boundary and validation.

See [PA-28 review batch 2](pa28-review-batch2.md) for additional model-specific references, final-publication provenance and remaining coverage.

See [fuel-system and airframe review](pa28-fuel-airframe-review.md) for serial-specific scope, supersession, publisher links and graph search.
