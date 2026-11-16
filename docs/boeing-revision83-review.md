# Boeing A16WE Revision 83 evidence review

Reviewed November 16, 2026, against [FAA A16WE Revision 83](https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID135416911620261112223011.0001), dated November 13, 2026. The targeted FAA download and existing private archive both match SHA-256 `fb4cc665cc769a767e9b6f3b02afd0b84922b257130b51f0a28a256615b655a9` (1,883,084 bytes).

## Scope and changes

Both Revision 82 and Revision 83 have 113 physical pages and list the same 17 models. Compared extracted text page by page after normalizing whitespace. The reviewed technical pages 21, 23, 24, 32, 59, 60, 67 and 68 are unchanged after that normalization. Those pages and the cover/model listing on page 1 were rendered and visually inspected again. Additional changed pages 72 and 111–113 were rendered and inspected to distinguish source changes from extraction/layout changes.

- Page 72 changes the 737-10 **date of application** to October 20, 2026. This is a different field from the model approval date on page 67; the app does not store an application-date fact.
- Page 111 adds the fuel-tank flammability ELOS entry `PS12-0038-P-2-NGS`, under §25.981(b)(2), for 737-8/-9/-8200 only. The existing `PS05-0177-P-2` entry is now explicitly limited to 737-7/-10. These findings are documented here; this phase does not create graph edges to unreviewed memoranda or claim complete certification-basis coverage.
- The added table row moves two existing ELOS entries onto page 112 and the 737-10 weight-and-balance manual identifier onto page 113. Existing technical citations used by the app do not move.

This review covers selected model/family/certificate/engine relationships and certification limits. It does not establish every serial number, engine configuration, certification-basis amendment, operational approval, installed modification or AD applicability for an individual aircraft.

## Restored evidence

The reviewed manifest is [boeing-revision83.json](../apps/worker/src/boeing-revision83.json). All 17 listed models receive family membership and A16WE certificate connections (34 paths). Seven models additionally have engine-family paths, detailed profiles and seven facts each (41 TCDS paths and 49 facts total): 737-700, 737-800, 737-900ER, 737-8, 737-9, 737-7 and 737-10.

The limits and their physical-page citations remain those described in the [Revision 82 review](boeing-revision82-review.md#current-reviewed-slice), now independently checked against Revision 83. Conditional passenger limits remain attached to the applicable exit configuration; base takeoff weights remain qualified as base configurations. No operational performance or actual airline cabin layout is inferred.

## Promotion and verification

`npm.cmd run review:boeing:revision83 -- --verify-only` checks the uniquely current FAA metadata and exact PDF bytes without database writes. Actual promotion additionally requires the matching private archived bytes and the service-only `review_boeing_revision83` RPC. Its transaction requires the current published source URL, revision, date, SHA-256, archive path and exact 17-model inventory. It updates seven profiles and writes new revision-bound facts/relationships; historical evidence remains stored. It refuses a path inventory other than 41. Old revision-specific review commands remain historical and cannot promote Revision 83.

Hosted promotion and a repeated invocation both returned 41 paths, 17 models, seven current Revision 83 profiles and 49 profile facts. AD/STC ingestion, discovery and monitoring scope were unchanged. No new aircraft families or bulk FAA imports were added. The website remains unpublished.

Worker tests cover changed originals/model inventories, malformed and incomplete metadata, nonunique current records, PDF mismatches before database access, and SQL/manifest agreement. Embedded PostgreSQL checks cover source-change suspension, private promotion, exact-original guards, revision-isolated facts, detailed page citations and repeated promotion without duplicates. Chrome and Edge browser journeys verify the 17-model network, 41 paths, arrow endpoints before/after dragging, selected-model limits, model switching, mobile width and actual archived citations on pages 1 and 67.

Next: finish the graph readability, motion and accessibility audit repairs, followed by the remaining profile/link workflows and release review.
