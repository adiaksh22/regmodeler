# Boeing 737 family review

Verified October 14, 2026, against the official FAA DRS record for TCDS A16WE, Revision 81, dated August 3, 2026. The website remains unpublished.

## Source and import result

- FAA record: [A16WE Revision 81](https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID187689605120260803182325.0001)
- Type certificate holder: The Boeing Company
- Current original SHA-256: `4a88ab57064783a155640b3eae4cbb812bb43596cce403f757c3d77be3f84e48`
- Imported history: 57 FAA revisions, each with an immutable privately archived PDF and metadata snapshot
- Current-model metadata: 16 FAA model/series identities
- Reviewed public family slice: six approved variants, one explicitly unapproved project boundary, 18 graph relationships, and 42 structured facts

The generic importer requires an exact uppercase certificate number, validates every DRS page and source URL, verifies a positive incremental result, downloads bounded PDF bytes without forwarding the FAA key elsewhere, and commits the complete catalog plus checkpoint in one service-role transaction. Repeating the import verifies existing archive bytes before advancing the checkpoint.

## Reviewed variants

| User-facing variant | FAA model identity | FAA approval shown in A16WE | Engine family | Base-model MTOW | Maximum passengers | Evidence pages |
| --- | --- | --- | --- | ---: | ---: | --- |
| 737-700 | 737-700 Series | November 7, 1997 | CFM56-7B | 154,500 lb | 149 | 21, 23, 32 |
| 737-800 | 737-800 Series | March 13, 1998 | CFM56-7B | 174,200 lb | 189 | 21, 23–24, 32 |
| 737-900ER | 737-900ER Series | April 20, 2007 | CFM56-7B | 187,700 lb | up to 220 | 59–60 |
| 737 MAX 8 | 737-8 | March 8, 2017 | LEAP-1B | 182,200 lb | 189 | 66–67 |
| 737 MAX 9 | 737-9 | February 15, 2018 | LEAP-1B | 194,700 lb | up to 220 | 66–67 |
| 737 MAX 7 | 737-7 | August 3, 2026 | LEAP-1B | 177,000 lb | up to 179 | 66–67 |

All six reviewed models have a two-person minimum crew, 340 KCAS VMO, Mach 0.82 MMO, and a 41,000-foot maximum operating altitude in the cited TCDS sections. These are certification limits rather than airline seating plans, typical operating values, or performance recommendations.

The 737-900ER and 737-9 maximum of 220 passengers requires an activated mid-cabin emergency door rated as a Type I exit; other listed configurations have lower limits. The 737-7 maximum of 179 requires both automatic-overwing-exit pairs active; deactivating either pair lowers the listed limit to 145. The interface preserves those conditions beside the values.

## 737 MAX 10 boundary

The cover of current A16WE Revision 81 lists 737-7, 737-8, 737-9, and 737-8200. It does **not** list 737-10. RegModeler therefore stores 737 MAX 10 as a `certification_project`, marks it `not_listed_in_current_tcds`, provides no approved-model technical facts, and prevents it from being selected as a certificated aircraft model.

This boundary is data-driven. A future FAA revision can add a real model identity, but the current catalog cannot infer approval from a Boeing product name, order announcement, or planned specification.

## Relationship graph

Each approved variant connects to:

1. the canonical Boeing 737 family node;
2. FAA type certificate A16WE; and
3. one shared approved engine-family node, CFM56-7B or LEAP-1B.

The six variants therefore produce 18 evidence-backed graph paths while reusing two engine nodes and one family node. The node-link diagram is the default desktop view. Selecting a node isolates its direct dependencies; selecting a link opens the exact FAA revision, page, excerpt, conditions, and archived PDF viewer.

## Change behavior

The scheduled FAA source job now reconciles A16WE alongside 2A13. The family review is pinned to Revision 81, its issue date, exact PDF hash, expected current model list, and absence of 737-10. If the FAA publishes a new current version, the old reviewed TCDS paths stop qualifying as current until the new original is inspected and a new review migration is applied.

No AD/STC applicability has yet been published for the 737 variants. The next evidence phase should select a small, high-value set of current 737 ADs, archive their official originals, and add serial/configuration predicates without treating a model-index match as individual-aircraft applicability.
