# Boeing A16WE Revision 82 evidence review

Reviewed November 3, 2026, against [FAA A16WE Revision 82](https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID161888576820261020201007.0001), dated October 20, 2026. The official PDF and imported archive both match SHA-256 `c61c215805c4210a6b6cd135099d41bb6dc244c72ee603de8bd512f75f964368`.

## Scope and comparison

The original is 113 pages, compared with 109 pages in the previously reviewed Revision 81. Pages 1, 21, 23, 24, 32, 59, 60, 67 and 68 were rendered and visually inspected. Text comparison found identical extracted text on the reviewed NG pages 21, 23, 32, 59 and 60. Page 24 has a serial-list punctuation correction outside the reviewed weight table. This is a review of selected facts and family/certificate/engine paths, not a complete comparison of every serial list, limitation or certification-basis amendment.

The MAX section now starts on page 67. Its engine, approval-date, airspeed and weight evidence is on page 67; crew, passenger/exit configuration and altitude evidence is on page 68. Old MAX citations must not be reused without checking their meaning.

## Current reviewed slice

| Model | Approval date in cited section | Base MTOW | Passenger maximum | Profile / weight / capacity pages |
| --- | --- | ---: | ---: | --- |
| 737-700 | 1997-11-07 | 154,500 lb | 149 | 21 / 23 / 32 |
| 737-800 | 1998-03-13 | 174,200 lb | 189 | 21 / 24 / 32 |
| 737-900ER | 2007-04-20 | 187,700 lb | 220, conditional | 59 / 59 / 60 |
| 737-8 | 2017-03-08 | 182,200 lb | 189 | 67 / 67 / 68 |
| 737-9 | 2018-02-15 | 194,700 lb | 220, conditional | 67 / 67 / 68 |
| 737-7 | 2026-08-03 | 177,000 lb | 179, conditional | 67 / 67 / 68 |
| 737-10 | 2026-10-20 | 197,900 lb | 230, conditional | 67 / 67 / 68 |

Passenger maximums preserve exit conditions. For 737-900ER/-9, 220 requires the mid-cabin emergency door activated as a Type I exit; other listed configurations allow 189 or 215. For 737-7, both automatic-overwing-exit pairs must be active for 179; either pair deactivated limits the listed capacity to 145. The 737-10 table lists 189 with its mid-cabin emergency door deactivated, 210 with a Type III exit and attendant station, 215 with Type II, 220 with Type I, or 230 with Type C. These are certification limits, not airline cabin layouts or proof of an individual aircraft's configuration.

All seven reviewed variants retain 340 KCAS VMO, Mach 0.82 MMO, a 41,000-foot maximum operating altitude and a two-person minimum flight crew. NG engine-family evidence is CFM56-7B; MAX evidence is LEAP-1B. Exact engine configurations and flight-manual limitations remain outside this family-level summary.

## Promotion and history

The service-only `review_boeing_revision82` function requires the exact current imported URL, hash, issue date and 17-model metadata list. It publishes 49 source-bound facts and 21 model/family/certificate/engine paths for seven variants. Repeated review preserves identities and counts. The fact view now joins each fact to the profile's exact evidence version, preventing old and new facts with duplicate JSON keys from mixing.

The old Boeing 737 MAX 10 project profile is retained as historical evidence and unpublished from the current summary. A distinct FAA aircraft-model entity represents 737-10; the old project is not relabeled into a certificated model. Earlier Revision 81 facts and relationships remain stored. A future current revision still suspends these TCDS paths until reviewed again.

Related AD/STC discovery and monitoring remain configured for the previous six Boeing models. MAX 10 has reviewed TCDS facts/paths only, and the interface states that limit. This phase does not expand FAA related-source ingestion or infer new AD/STC applicability.

## Verification and next phase

Local quality checks passed: 96 frontend tests, 43 worker tests, embedded database source guards, seven-model promotion, revision-isolated facts, retired project notice and repeated-review checks, lint, types and build. Hosted verification passed seven current approved profiles, 49 facts and 21 current TCDS paths on two consecutive reviews. Browser checks passed source-linked MAX 10 limits, its three node connections, archived PDF page 67, NG switching, 58-or-more imported revisions, explicit AD/STC coverage limits and mobile layout.

The user selected node/network exploration as the first UI refinement priority. Broader aircraft/source expansion can wait while graph navigation and the portfolio beta journeys are refined. The website remains unpublished.
