# First Boeing 737NG AD/STC source review

Reviewed October 27, 2026, for supported Models 737-700 and 737-800. This batch adds eight public model-scoped paths from six physical relationships. The website remains unpublished.

## Reviewed evidence

| Source | Exact original and reviewed page | Mapped relationship |
| --- | --- | --- |
| AD 2001-14-05 | [GovInfo FR document 01-17121](https://www.govinfo.gov/content/pkg/FR-2001-07-11/pdf/01-17121.pdf), physical page 2, printed 36146; identified in the official July 11, 2001 issue XML | The applicability paragraph includes all 737-600/-700/-700C/-800 series. Only supported 737-700/-800 identities are mapped. Paragraph (a) references Boeing AOM M-7200-01-00756 Revision 1, May 29, 2001, for the elevator-tab repair installation restriction. |
| STC SA01635LA | [FAA DRS original](https://drs.faa.gov/browse/excelExternalWindow/B4937613F858F5748625721F0058F42D.0001), page 1 | The certificate explicitly lists A16WE and 737-700/-800 Series for the cabin noise-reduction kit and references Aerocon Master Index AC25-BBJ-7370 Revision NC, August 22, 2006. |

The AD original hashes to `1318628c715aecbd0a11598d639a3435f74edda6bafe4ac918aab97e4ab2586a`; the STC original hashes to `3877ca36480b7d4b33b6d868f243e0c112dcb503f2298fc0a65714b2dd7a5a6c`. Cited pages were rendered and visually reviewed. The FAA AD record is [2001-14-05](https://drs.faa.gov/browse/excelExternalWindow/38671E9CB14B15CF86256A860053FF82.0001), verified Current through a named document-number query.

The AD imposes a restriction on installing elevator-tab repairs; the graph does not imply every aircraft needs a new repair. The referenced Boeing message has not been obtained. The STC model list appears directly on the certificate, so a separate AML is not needed for these observed model connections. Its referenced master index/design data have not been obtained. Installation, compatibility, rights to alter and aircraft-specific compliance remain unresolved.

## Source-quality findings

The SA01635LA primary download has **one PDF page whose footer says Page 1 of 2**. The second page has not been obtained. Every public STC path exposes this limit; the archive metadata records the delivered versus printed page counts. Only the observed model list and master-index reference are mapped, and complete certificate terms are not established. The review worker rejects changed bytes rather than silently inheriting this review.

Candidate **SA04009NY** is deferred: its FAA index number is SA04009NY, but the primary PDF header and continuation say ST04009NY. That PDF hashes to `2c3ad86cdcb0cca39713943b475003e6c5c793bfa794ca22d92c38065cf1cc1f`. No graph connection was published from this candidate. Both supported model observations have a private review note and public deferred status. The system does not silently change the source identity.

## Canonical navigation and bounded execution

FAA names such as `737-800 Series` remain unchanged in source metadata and entity natural keys. The public graph resolves canonical model names through entity-ID-backed source-scope mappings. The model dropdown and family buttons now share the reviewed NG aliases. Canonical and legacy Series URLs both select the correct model and its facts; MAX identities remain distinct.

`npm.cmd run review:boeing:ng -- --verify-only` reads just the two named FAA records and their pinned originals. Without `--verify-only`, it additionally archives the originals and invokes the atomic, service-only graph review. It does not import a full aircraft-family catalog. Missing original/provenance/model membership, changed tuples, attachment inventory or byte fingerprints stop the review. A missing active model match aborts publication, and repeat review does not duplicate paths.

Hosted migrations 20261027000200–20261027000400 and source archival are applied. Repeated hosted review retained eight paths. Tests cover model aliases, tuple integrity, exact manifest parity, publication/hash guards, inactive matches, private core functions and repeat review. Browser smoke covers both NG models, canonical and legacy URLs, correct selected family facts, AD/STC evidence, archived STC page 1, missing-page wording, mobile width and existing MAX graph regression.

Follow-up review found complete, separate ST04009NY and ST01635LA FAA records and added curated public links from the unresolved SA entries. The SA records remain distinct and their original findings remain visible. See [STC source-quality follow-up](boeing-stc-source-quality.md) for exact originals, model-specific maintenance scope and remaining limits.
