# Boeing STC source-quality follow-up

Reviewed October 27, 2026. The original SA-prefixed entries are preserved. Separate, complete ST-prefixed FAA records now provide reviewed source paths for supported 737-700 and 737-800 models. This review does not establish a renumbering, equivalence or supersession between the SA and ST records.

## Verified complete records

| Certificate | Official FAA record | Exact original SHA-256 | Review |
| --- | --- | --- | --- |
| ST04009NY | [Current ST04009NY](https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID198838941920250501135110.0001) | `bb7d2494050a277dd6ca56ac9e07653384cc95231c44f55c6a2b050a2d9bdab1` | Three pages; reissued January 8, 2025. Page 1 establishes supported model scope and ADS-B design/AFMS/ICA references; page 3 carries continued limitations and the certification basis. |
| ST01635LA | [Current ST01635LA](https://drs.faa.gov/browse/excelExternalWindow/70809A3F184E1A538625802F00674984.0001) | `60fdc54d5b816ea8d85d186cdef7b37702e6303cc3f771eeedf2c9963d92403c` | Three pages; amended August 18, 2016. Page 1 establishes supported model scope, compatibility/records/permission conditions and model-specific maintenance supplements. Page 3 limits the stated Part 26 basis to index Revision J dated July 30, 2012 or later FAA-approved revisions. |

The relevant pages were rendered and visually reviewed. Both certificates also list aircraft beyond this application's supported scope. Only 737-700/-800 model connections are published here; neither a certificate number nor a model match proves an installation or aircraft compliance.

ST04009NY references AerSale Master Data List B737-MDL-0019 Revision A (June 11, 2019), AFMS B737-AFM-0017 Revision IR (September 4, 2019), and ICA B737-ICA-0019 Revision B (June 11, 2019). The certificate describes transponders, receivers, antennas and annunciators, requires existing Mode S/ELS/EHS compliance and failure indication, and preserves installer compatibility and holder-permission conditions.

ST01635LA references Aerocon Index AC25-BBJ-7370 Revision NC (August 22, 2006). Its 737-700 path references maintenance supplement AC25-1346 Revision NC (February 18, 2006); its 737-800 path references AC25-1340 Revision NC (May 10, 2006). These are scoped reference relationships: one model cannot inherit the other's maintenance supplement. The supporting documents themselves have not been obtained. The certificate's later Revision J certification-basis condition is shown in the main evidence panel rather than silently changing the installation-index edition.

## Findings retained on original records

- **SA04009NY:** the current named FAA query still delivers the three-page PDF whose header and continuation identify ST04009NY. It remains deferred. The curated public finding links to the separately reviewed ST04009NY record without merging identities.
- **SA01635LA:** the current named query still delivers only a single page labelled Page 1 of 2, with no additional attachments. That missing page remains unobtained. Its existing page-supported model/reference paths retain their incomplete-source notice. The finding links to the separate complete ST01635LA record and explicitly warns that the records are not interchangeable.

FAA returned four ST04009NY revisions and six ST01635LA revisions during the bounded investigation. Production review queries four exact certificate numbers and downloads only each current original; it does not reconcile a family catalog or import all historical PDFs. Investigative downloads are ignored local evidence. No holder/FAA message has been sent.

## Implementation and validation

The review manifest is `apps/worker/src/boeing-stc-resolution.json`. `npm.cmd run review:boeing:stcs -- --verify-only` checks the four named originals without database writes. The normal command additionally archives immutable originals, publishes guarded relationships and saves curated findings against exact source versions. The service-only SQL transaction requires exact document identities, original hashes, publication and active model membership. Repeating review preserves graph/finding counts.

`relationship_model_scopes` foreign-keys each restricted reference to reviewed aircraft profiles. The public graph retains scoped IDs even if other rows become unpublished, so hiding a scope cannot widen the path. Ten physical relationships produce fourteen public model-scoped graph paths.

Curated `source_quality_findings` remain private tables. The bounded `source_quality_details` RPC exposes only published source findings for the requested model and a still-published/current/reviewed alternative link. It does not expose operator private notes. The UI loads findings only for a selected graph or related-record evidence panel; opening a TCDS does not preload these records.

Hosted migrations 20261027000500 and 20261027000600 are applied. Hosted repeat review preserved fourteen paths and confirmed each maintenance supplement's exact model. Tests cover SA/ST identity separation, original byte changes, targeted response completeness, manifest parity, wrong-model path exclusion, finding privacy, unpublished alternatives and idempotence. Browser checks passed the two complete certificates, both original-record findings, official links, model-specific supplements and mobile width. All local quality checks passed.

Next engineering work: make the review-coverage tab searchable and server-paginated, then perform the portfolio beta coverage/freshness audit. Further source claims for the original SA records require authoritative clarification or their missing material; the site remains unpublished.
