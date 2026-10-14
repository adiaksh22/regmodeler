# PA-28 source review, batch 2

Completed October 14, 2026, following the user's choice to prioritize additional reviewed AD/STC relationships over new profile fields. The hosted graph now exposes **47 model-scoped rows**, including **14 reviewed AD/STC model connections**. This batch adds four archived originals, five model connections and nine physical reference relationships. Shared reference edges appear once per supported model in the scoped API and are deduplicated in the combined node view.

## Reviewed sources

| Source | Supported model scope reviewed | Evidence pages | Reference paths added |
| --- | --- | --- | --- |
| [AD 2024-10-04, FAA record](https://drs.faa.gov/browse/excelExternalWindow/FR-ADFRAWD-2024-11143-0000000000.0001) | PA-28-181, subject to the referenced serial list | Final published PDF page 4, printed page 44917 | Piper SB 1413, April 9, 2024 |
| [STC SA09252AC-D](https://drs.faa.gov/browse/excelExternalWindow/96BF6ED5AC33ADFA85256CC1007F3A42.0001) | PA-28-181 | Pages 1 and 2 | AFM supplement 891444, Bulletin 804, drawing list 921010 |
| [STC SA09257AC-D](https://drs.faa.gov/browse/excelExternalWindow/471D48E1034CE60585256CC1007F3A48.0001) | PA-28-140 | Pages 1 and 2 | AFM supplement 891454, Bulletin 812, drawing list 921012 |
| [STC SA4930SW](https://drs.faa.gov/browse/excelExternalWindow/BDACDBC593FE516685256CC2000E3FBD.0001) | PA-28 Series under 2A13; only the two independently reviewed supported members are mapped | Page 1, with current reviewed TCDS membership as a review prerequisite | Dated SC-150 flight-manual and installation supplements |

Exact reviewed PDF hashes, model conditions, dated reference identities and page excerpts are recorded in `apps/worker/src/review-batch2.json` and the guarded schema migration. The originals were rendered and visually inspected, including the autopilot continuation sheets. Reference relationships establish what the certificate/AD cites; they do not indicate that the underlying manufacturer documents have been retrieved.

The two autopilot certificates distinguish different hardware, design data and required supplements. Conditions for PA-28-151 or PA-28-235 do not become modification dependencies for PA-28-181 or PA-28-140. The broad PA-28 Series approval is labeled as such, rather than presented as an explicit enumerated model list. Installation and compatibility remain unverified for an individual aircraft.

## Native HTML and publication provenance

DRS returned HTML as the main document for AD 2024-10-04 and a legacy candidate, AD 77-01-01. The PDF reader correctly refused those responses. The legacy candidate remains pending; no PDF pages or new scope were invented for it.

For AD 2024-10-04, the original used for PDF evidence is the [final Federal Register publication on GovInfo](https://www.govinfo.gov/content/pkg/FR-2024-05-22/pdf/2024-11143.pdf), not its pre-publication draft. Its FR document number, docket, amendment, publication date, effective date and text were checked against the FAA record. Physical page 4 contains the applicability and incorporated-reference paragraphs. The PDF contains adjacent publication content; only the selected AD's text is reviewed here.

The downloader derives an exact allowed GovInfo URL from the FAA's `FR-ADFRAWD` document identity and publication date, refuses redirects, bounds the file size and requires PDF magic. It sends no FAA credentials to GovInfo. Reviewed bytes must also match the pinned hash before archival. The source version keeps its canonical FAA record URL and separately records the published-original URL, publication date and source kind. Both links appear in the evidence inspector, avoiding PDF-page claims on the HTML record link.

AD serial applicability remains **Configuration needs review** because Piper SB 1413's serial list has not been retrieved. The referenced bulletin node states that limitation. No serial ranges were inferred from a model match or from unrelated ADs.

## Operation and validation

```powershell
npm.cmd run review:batch2
```

Run with private worker configuration after the exact current FAA metadata observations have been imported. A new PDF hash, source observation or attachment inventory requires renewed review. The curated review RPC is service-only and commits the batch atomically. A missing current source, publication provenance, model-index association or required reviewed series-membership anchor causes rollback. Repeating the hosted review preserved 47 graph rows without duplicates.

The schema migration is applied to both local and hosted databases; these additional source archives and reviewed edges were imported into the hosted catalog. The local source data was not expanded. Local schema application used transactional Docker `psql` because Windows host-port database access remains unavailable.

Validation passed: 65 frontend/domain tests, 21 worker tests, embedded PostgreSQL review/access checks, lint, types and production build. Browser checks cover the final published-original link, cited PDF pages 4 and 2, model-specific supplement traversal, node dragging, shared identities, review coverage and mobile layout. Screenshots of the new source paths were inspected.

Daily metadata reconciliation remains enabled. Manufacturer source retrieval, full configuration rules, legacy HTML evidence support and automatic attachment-byte checks remain future work. The website remains unpublished.
