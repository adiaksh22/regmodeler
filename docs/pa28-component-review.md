# PA-28 component source review

Completed October 14, 2026. Hosted coverage increased from 71 to **84 model-scoped graph rows**, with **24 reviewed AD/STC-to-model connections**. Three newly reviewed ADs add four model connections and seven physical reference/supersession edges (13 model-scoped rows). Two existing AD 2024-10-04 paths were enriched without replacing their evidence IDs.

| FAA original | Reviewed models | Physical PDF evidence | Relationships and limits |
| --- | --- | --- | --- |
| AD 2017-14-04 | PA-28-140 and PA-28-181 | Page 6: scope and supersession; page 9: hose conditions | Supersedes AD 95-26-13; references TSO-C53a. Applicability depends on installed hose equipment, not serial alone. |
| AD 2016-07-21 | PA-28-181 | Page 6: serial groups and supersession; page 7: actions and incorporated bulletins | Supersedes AD 2015-20-13; references SB 1279A and conditional SB 1279 alternative. Serials 2843776-2843778 remain outside the reviewed intervals. |
| AD 2004-14-12 | PA-28-181 | Page 6: groups; page 7: actions/prior-work exception; page 8: incorporation | SB 1139A and conditional prior SB 1139 reference. Group A Part I and Groups A/B Part II remain distinct. FAA original includes the August 20, 2004 correction. |
| AD 2024-10-04 (existing) | PA-28-181 | Page 4 of final published rule, printed page 44917 | Added verified publisher link to SB 1413. External serial list remains outside automatic profile matching. |

Original hashes, excerpts and conditions are pinned in [review-batch4.json](../apps/worker/src/review-batch4.json). FAA PDFs were rendered and visually reviewed. The three new ADs' supplementary DRS HTML attachments are privately archived as inert text; they are not served as active web pages. The existing AD retains its final Federal Register PDF provenance. Migrations 20261014000900 and 20261014001000 preserve the applied review history; the latter records final paragraph-label and subject corrections. Repeat review must match the exact originals and active model observations. Only the privileged worker can publish these paths.

## Publisher links

Retrieved through [Piper's official public catalog](https://www.piper.com/technical-publications/):

- [SB 1279A, March 3, 2016](https://s3.amazonaws.com/pipercrm/Solution/18760/SB%201279A.pdf)
- [SB 1139A, April 9, 2004](https://s3.amazonaws.com/pipercrm/Solution/472/SB%201139A.pdf)
- [SB 1413, April 9, 2024 PDF edition](https://s3.amazonaws.com/pipercrm/Solution/20958/SB_1413.pdf), catalog release April 18, 2024.

Each catalog identity, exact URL and full PDF hash was verified. First-page identity, date and selected model rows were visually checked; this is not a complete procedural review. The application links to publisher files rather than mirroring them. A separate explicit catalog date handles SB 1413's release/edition distinction. Strict trusted-path checks now accept spaces in official filenames while rejecting query strings, fragments, encoded filenames and traversal. No FAA credentials are sent to publisher hosts.

Earlier bulletin editions and superseded ADs remain reference-only where their originals have not been retrieved. TSO-C53a is an equipment-standard reference; its full original was not reviewed. None of these links establishes installed equipment or completed maintenance.

## Verification and remaining work

Checks cover inclusive serial endpoints and the three-serial gap, equipment scope remaining unknown, distinct action groups, exact JSON/SQL evidence parity, publication provenance, atomic rollback, stable enrichment IDs, repeat review, inactive-source visibility, private write permissions, trusted publisher URLs and date binding. Chrome checks cover the hosted graph, profile results, publisher links with spaces, dates, cited PDF pages, supersession and mobile width. Run `npm run check` and, with the hosted public frontend configuration, `node --env-file=.env.production.local scripts/component-review-smoke.cjs`.

Daily scoped FAA metadata checks remain enabled. Publisher PDFs and attachment bytes are reviewed snapshots, not continuously monitored content. The website remains unpublished. Next source work should add durable evidence for external serial tables and review remaining AD/STC references, followed by attachment freshness checks and content comparisons. Browser profiles do not determine regulatory compliance.
