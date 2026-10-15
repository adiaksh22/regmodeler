# PA-28 related sources and reviewed dependencies

Verified October 13, 2026, for PA-28-140 and PA-28-181. These are scoped FAA index results, not a complete applicability or compliance determination. The website remains unpublished.

## Source contracts

FAA DRS uses authenticated `POST /api/drs/data-pull/<type>/filtered`, offsets of 750 and documented `documentFilters`. The normal AD type is `ADFRAWD`; emergency ADs use a separate type. Daily jobs request only a timestamp window after the checkpoint; weekly jobs fully reconcile each scoped catalog, including undated records. Explicit per-family record ceilings prevent an accidental broad query from turning into an FAA-wide import.

| Source | Filter | Records | Model matches | Positive incremental results |
| --- | --- | ---: | ---: | ---: |
| AD (`ADFRAWD`) | `drs:adfrawdModel`: PA-28-140 / PA-28-181 | 58 | 77 | 1 |
| STC | `drs:stcTCNumbers`: 2A13; `drs:stcModel`: selected models | 856 | 1,414 | 4 |
| CAR | `drs:documentNumber`: CAR 3 | 59 | 0 | 1 |

The totals include current and historical source records. A record matching both models contributes two model matches. STC associations use `drs:stcTCNumbersMakeModel` tuples, preserving the certificate/model relationship rather than combining independently matched arrays. Forty-nine STC records have no modification timestamp. They remain in full reconciliation and are explicitly excluded from timestamp-based incremental results; no modification date is fabricated.

Every raw canonical metadata JSON file is archived privately by SHA-256. One service-only transaction commits the complete index, retains previous observations, changes active matches and advances the checkpoint only on success. Repeated imports retain first retrieval dates and reviewed enrichment. The frontend requests 24 filtered rows at a time from a database RPC and loads large AD text only after selection; it never downloads the complete model index to open the tab.

## Reviewed originals

The following primary PDFs were downloaded, rendered and visually inspected. Review requires the exact PDF hash; a changed original must receive a new review. These source identities are public FAA identifiers, not credentials.

| Original | FAA identity | SHA-256 | Review |
| --- | --- | --- | --- |
| AD 2020-24-05 | `1435453A14D21FB6862586290049FC9F.0001` | `56bcc802e7a5a992be7a62c9fa84c9c31cf6cbeccbf0ef93584a73ab9c64652d` | Page 5 model/serial scope; page 7 service-bulletin reference |
| STC SA2230CE | `DRSDOCID107181097320231011141916.0001` | `42968de3068a3da4cf72896c64d1ae06db594feb7889855d4c43d9fe71371463` | Page 1 approved models, replacement stabilator tips and compatibility limitation |
| CAR 3 as amended May 15, 1956 | `FAA00000000000000000CAR003007PDF.0001` | `37dcede85853240718170ed439e9208748ccde1a160513c0f04b1344300da330` | Original scan and dated cover |
| CAR amendment 3-7 | `FAA00000000000000000CAR003020PDF.0001` | `5f448d5b2b6b3d97fe3059203df152dc81c5176330ea0827c2a305855c9d0164` | May 3, 1962 amendment; sections 3.304 and 3.705 on pages 4 and 5 |

Four new edges supplement the 15 reviewed TCDS connections: AD conditional model scope, two STC model approval connections, and the AD's reference to Piper SB 1304A. Installation, licensing rights, aircraft compliance and availability of the manufacturer's bulletin text are not inferred. Current graph edges require current, active published source evidence; a corrected metadata observation hides old edges until renewed review.

CAR amendment numbers recur in the archive. Identity must be established from the original date and text. The baseline plus amendment 3-7 is not a complete consolidation of the CAR basis. Unreviewed amendments remain pending.

## Dated regulatory text

Seven Part 23 sections come from [GovInfo's 2016 annual CFR XML](https://www.govinfo.gov/content/pkg/CFR-2016-title14-vol1/xml/CFR-2016-title14-vol1-part23.xml): 23.207, 23.221, 23.955, 23.959, 23.1327, 23.1547 and 23.1557. XML edition identity is checked and DTD/entity declarations are rejected. Source XML is privately archived. These sections are explicitly labeled **later reference edition**, not the exact 1969/1977 amendment wording cited by the TCDS and not today's regulation. CAR scans remain original-only because OCR quality was insufficient for verified text.

## Commands and source viewer

After applying migrations, configure private worker variables in ignored `.env.local` and run:

```powershell
npm.cmd run import:related:verify
npm.cmd run import:related
npm.cmd run import:reference
npm.cmd run review:pa28
```

`-- --type=AD`, `STC`, or `CAR` limits related-source jobs. Review downloads only the four known originals and refuses changed hashes or metadata not yet imported. The manual related-source workflow defaults to verification. Daily TCDS/AD/STC checks are now enabled with protected repository secrets; CAR and reference-text imports remain manual. See [source-change tracking](source-change-tracking.md).

Deploy the PDF viewer backend with `npx.cmd supabase functions deploy source-viewer --use-api`. The function uses the platform-injected Supabase server credential, never the FAA key. Its public endpoint accepts a version UUID, checks document/version publication, FAA type and exact hash-addressed PDF path, then issues a five-minute signed URL. Callers cannot choose arbitrary storage paths or obtain raw metadata JSON. Direct bucket access remains private. `verify_jwt=false` allows reading public FAA snapshots through these explicit publication checks; this is not an account-authentication endpoint. Local Docker startup excludes the edge runtime, so local PDF viewing requires serving this function separately. The hosted-data preview uses the deployed function.

## Remaining coverage

Most discovered primary PDFs and additional attachments remain unarchived; the UI states their status. AD extracted text may omit applicability tables and graphics. Selected originals, attachments and one AML have now been reviewed and archived, bringing hosted coverage to 136 model-scoped graph rows. Thirteen current paths expose canonical installed-component identities across seven reviewed equipment-dependent ADs. See [installed-equipment review](pa28-installed-equipment-review.md), [Garmin publication review](pa28-garmin-publication-review.md) and [node navigation and review coverage](node-graph-and-review.md). Further AMLs, manufacturer service documents, noise/optional-equipment provisions, other PA-28 model reviews, exact historical CFR amendment wording, compound configuration rules and broader automated attachment retrieval remain future work.

See [PA-28 review batch 2](pa28-review-batch2.md) for additional model-specific references, final-publication provenance and remaining coverage.

See [fuel-system and airframe review](pa28-fuel-airframe-review.md) for serial-specific scope, supersession, publisher links and graph search.
