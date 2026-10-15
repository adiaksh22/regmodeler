# PA-28 Garmin publication review

Verified October 14, 2026, for PA-28-140 and PA-28-181 under TCDS 2A13. This review adds evidence-backed paths for three Garmin configurations. It does not determine AD applicability or compliance for an individual aircraft. The website remains unpublished.

## Reviewed sources and relationships

FAA DRS returned current record metadata for all three ADs, but each record's main download resolved to generated HTML rather than stable PDF bytes. The review therefore binds each current FAA record to its official final Federal Register publication from GovInfo. Each PDF was downloaded, fingerprinted, rendered, and visually inspected before its relationships were published.

| Current FAA source | Official final publication | Reviewed PA-28 configuration | Cited physical PDF pages | SHA-256 |
| --- | --- | --- | --- | --- |
| AD 2024-14-03 | [89 FR 57721–57725](https://www.govinfo.gov/content/pkg/FR-2024-07-16/pdf/2024-15529.pdf) | Garmin GFC 500 with optional GSA 28 pitch-trim servo, installed under STC SA01866WI with an identified MDL revision | 3 and 5 | `c7be1903331497057fb55faf9ed5994e61774d8acd287cbbc1cb0da5df423b89` |
| AD 2022-03-15 | [87 FR 8157–8167](https://www.govinfo.gov/content/pkg/FR-2022-02-14/pdf/2022-03000.pdf) | G3X Touch under STC SA01899WI or GI 275 under STC SA02658SE, with an eligible MDL revision and GEA 24 resistive-fuel-probe interface | 3, 6, and 9 | `a2992fd94cb167d69195285d0d8578e939faa89df9ee7abbba05f3c27da4397c` |
| AD 2001-23-17 | [66 FR 60140–60142](https://www.govinfo.gov/content/pkg/FR-2001-12-03/pdf/01-29325.pdf) | Garmin GNS 430 P/N 011-00280-00 with an exact affected unit serial number | 2 and 3 | `1b1ed4420e7fd3d8ddefcbac6f7310bcf1c64afeb80bb324b28180cbd517b8a1` |

The guarded transaction creates six physical AD-to-model roots and ten physical component, STC, and service-document references. Scoping those paths to both supported PA-28 models produces 26 public graph rows, including six `affects_component` paths. The hosted catalog now contains **136 model-scoped graph rows** and **36 reviewed AD/STC-to-model connections**.

Service documents cited by an AD remain reference nodes unless their own text has been separately retrieved and reviewed. A reference edge does not establish an installed STC, completed modification, or compliant software version.

## Aircraft-profile behavior

The profile editor now offers one reviewed choice for each complete root configuration:

- `GARMIN:GFC500-GSA28-PITCH-TRIM`
- `GARMIN:G3X-GI275-GEA24-RESISTIVE-FUEL`
- `GARMIN:GNS430-011-00280-00-AFFECTED-SERIALS`

Users record a choice as installed, not installed, or unknown. An installed answer raises the matching AD path for attention, but the result still asks for the remaining STC, drawing-list revision, software, part-number, unit-serial, completed-work, and aircraft-record checks. A generic Garmin product name is deliberately insufficient because each reviewed rule depends on a more specific configuration.

Profiles remain a browser-local overlay. User-entered data is visually separated from publisher facts and is never written to the regulatory catalog.

## Publication integrity

The modern GovInfo validator derives the expected Federal Register document identity and publication-date path from the current FAA DRS record. AD 2001-23-17 predates that modern FAA identity convention, so it uses a separate legacy validator that requires the exact reviewed AD number, publication date, trusted GovInfo host, dated Federal Register package path, and legacy document filename pattern. Both validators reject credentials, query strings, fragments, non-HTTPS URLs, and unexpected paths.

Publication fails closed if any of these checks changes:

- current and published FAA document/version state;
- exact official-PDF SHA-256;
- active model match for the evidence version;
- exact original URL and `final_federal_register` source kind;
- expected DRS attachment inventory; or
- exact JSON-to-migration review manifest.

The database procedure is available only to the privileged service role, uses one advisory transaction lock, and inserts relationships idempotently. Repeating it returns the same reviewed result without creating duplicate graph connections. If a current source observation is withdrawn, its model-scoped rows disappear from the public view instead of silently retaining stale applicability.

## Next review work

1. Represent alternative and compound predicates as structured condition groups so the G3X and GI 275 branches can be evaluated independently.
2. Expand reviewed coverage to another model on TCDS 2A13 so existing certificate, source, and component nodes are reused.
3. Retrieve cited manufacturer bulletins when durable publisher originals are available and show their independently verified state.
4. Complete a portfolio-beta review after the data model, graph traversal, and change feed are stable.

The preceding equipment batch and broader scaling approach are documented in [PA-28 installed-equipment review](pa28-installed-equipment-review.md) and [the product and delivery plan](project-plan.md#how-the-system-scales).
