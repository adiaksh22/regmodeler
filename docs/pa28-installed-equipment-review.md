# PA-28 installed-equipment relationship review

Verified October 14, 2026, for PA-28-140 and PA-28-181 under TCDS 2A13. This batch adds component-aware research paths; it does not determine installation, airworthiness-directive applicability or compliance for an individual aircraft. The website remains unpublished.

## What was added

Four current FAA AD originals were downloaded, fingerprinted, rendered and visually inspected. The guarded database transaction publishes six model-to-AD connections and 13 document-to-component/reference connections. Model scoping produces 26 graph rows across the two supported aircraft, including seven `affects_component` paths. Hosted totals are now 110 model-scoped graph rows and 30 reviewed AD/STC model connections.

| Current source | Supported model path | Reviewed equipment condition | Evidence pages |
| --- | --- | --- | --- |
| AD 2005-01-19 | PA-28-140 and PA-28-181 | Installed Garmin GTX 33/33D/330/330D plus specified software versions | 5, 7, 9-10 |
| AD 2006-03-08 | PA-28-140 and PA-28-181 | Installed Aero Advantage ADV200 P/N ADV211CC or ADV212CW | 6-9 |
| AD 2005-25-08 | PA-28-181 | Installed Shadin ADC-2000 identified part numbers in configuration B, C or D | 5-6 |
| AD 2006-12-07 | PA-28-140 | Specified ECi Classic Cast cylinder identity combined with an applicable Lycoming parallel-valve engine | 4, 7, 12, 14 |

The graph also exposes the cited prior ADs, possible STC installation route and manufacturer service documents. A citation is a relationship to inspect; it does not imply that bulletin text was retrieved, an STC is installed or an action was completed.

## Profile behavior

The aircraft-profile editor derives its equipment choices from reviewed root conditions for the selected model. A user can record each offered family as installed, not installed or unknown and add a record-reference note.

- **Installed — user reported** marks the reviewed AD path for attention but still asks for exact part, software, serial, configuration, prior-action and record review.
- **Not installed — user reported** marks that reviewed equipment condition outside the supplied profile and allows the optional outside-scope filter to hide it.
- **Unknown or missing** keeps the path visible and labels installation as unknown.

The Lycoming engine-family node is visible in the graph as an additional predicate for AD 2006-12-07. It is not offered as a standalone profile shortcut because engine installation alone is insufficient; the reviewed root condition is tied to the affected ECi cylinder identity.

Profile data stays in browser storage. It is kept separate from FAA facts and is never written into the regulatory catalog.

## Source integrity and publication gates

Each primary PDF must match its reviewed SHA-256 before archival or graph publication:

| Source | SHA-256 |
| --- | --- |
| AD 2005-01-19 | `ebceaed478eb1c0c84226c633f6556ae98a1800d9974cecb44f758986994b74f` |
| AD 2006-03-08 | `afb93197ba8601823bd0df8afb97f405462408dc25843fdc4298aa3fd66d6872` |
| AD 2005-25-08 | `1331eaaad4b2632cab64dfe7dc5b6ad345556c96f09eef64bd5881be8e3dcea0` |
| AD 2006-12-07 | `0e779f27e83c4818168ca39ce36f01326bfd91a49194c3c1b6e58aab3cae480c` |

FAA DRS also provides one generated HTML companion for each record. Its Akamai telemetry hostname changes between downloads even when the regulatory content does not. The review job therefore locks the exact one-file inventory and filename, archives each retrieval as inert text with its observed hash, and keeps graph approval pinned to the stable primary PDF and cited pages. The HTML is not executed or treated as evidence.

Publication fails closed when the current FAA metadata version, PDF hash, attachment inventory, source status or expected model match changes. The graph function also verifies that every reviewed source has an active current observation and the exact archived original before replacing current rows. Repeating the transaction does not duplicate connections.

## How this layer scales

Canonical equipment identities prevent a many-aircraft duplication problem. For example, the Garmin transponder family is one node. Both PA-28 models point through their own reviewed AD evidence to that shared node, and future aircraft models can reuse it. The AD original and its manufacturer references also remain single canonical records.

Adding another model therefore means reviewing and storing model/configuration edges, not copying all source documents. Adding another user aircraft means storing only a small profile overlay. Source changes create immutable versions and review events; they do not overwrite historical evidence.

The next useful review work is:

1. Build a provenance path for three newer Garmin records whose current FAA DRS main-document response is HTML rather than the stable PDF pattern used here: AD 2024-14-03, AD 2022-03-15 and AD 2001-23-17.
2. Add compound conditions where an outcome depends on more than one profile fact, beginning with engine plus cylinder identity and software/configuration ranges.
3. Review one additional 2A13 model so the same TCDS and component nodes can be reused across a wider model set.
4. Add profile import and later optional private accounts only after local relevance behavior is stable; accounts will support cross-device profiles and watchlists, not certify user-entered data.

The broader sequence and capacity boundaries are documented in [the product and delivery plan](project-plan.md#how-the-system-scales).
