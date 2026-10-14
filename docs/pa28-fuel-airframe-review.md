# PA-28 fuel-system and airframe review

Completed October 14, 2026. Hosted coverage increased from 47 to **71 model-scoped graph rows**, with **20 reviewed AD/STC model connections**. This batch adds six model connections and thirteen physical reference/supersession edges. Shared edges appear in each applicable model scope and are deduplicated in the combined node canvas.

## Reviewed originals and connections

| Original | Reviewed model scope | Physical PDF pages | Added paths |
| --- | --- | --- | --- |
| AD 2018-07-03 | PA-28-140 and PA-28-181, with separate reviewed serial tables | 6: scope/supersession; 7-10: conditions, references and illustrated appendix | SB 1309A; dated prior-action reference to SB 1309; supersedes AD 2018-02-05 |
| AD 2010-15-10 | PA-28-140 and PA-28-181, with separate reviewed serial tables | 7: scope; 10: incorporated references | SB 1197A or SB 1197B as named alternatives |
| AD 2005-19-20 | PA-28-181, subject to serial, dated STC-installation and service-change conditions | 5: scope and installation predicates; 6: incorporated bulletin | STC SA2660CE; SB98-1; SB 05-2 |
| STC SA2660CE | PA-28-181 explicitly listed in continuation item 6, subject to the table and certificate limitations | 1: design data and limitations; 3: model/electrical/serial table | Alternative engine approvals SE2563CE or SE2587CE; two dated drawing lists; AFM supplement No. 2 |

FAA originals were downloaded, rendered and visually reviewed. Exact original hashes, page excerpts, model conditions and canonical reference identities are pinned in `apps/worker/src/review-batch3.json` and migration `20261014000800`. Three supplementary DRS HTML files are archived privately as inert text and are not used to approve graph evidence. A changed PDF, metadata observation or attachment inventory refuses automatic publication by the review job.

The existing STC SA2660CE node is shared by its own model-approval path and the AD's conditional reference. Referenced engine approvals remain reference-only: their originals and installation on an individual aircraft were not verified. The graph does not imply that both alternative approvals must be installed. Supersession is a distinct directed relationship backed by the replacing AD; the replaced AD is not presented as newly reviewed current scope.

## Publisher originals

Piper's [public technical-publications catalog](https://www.piper.com/technical-publications/) identifies these dated PDFs:

- [SB 1309A, March 6, 2018](https://s3.amazonaws.com/pipercrm/Solution/19055/SB_1309A.pdf)
- [SB 1197B, May 3, 2010](https://s3.amazonaws.com/pipercrm/Solution/19038/SB_1197B_AD_ref.pdf)

Their publisher catalog identities, release dates, download locations and full-file SHA-256 hashes were verified, and their first-page identities, dates and selected model rows were visually inspected. The application links to the publisher copies; it does not mirror these bulletins or convert their procedures into compliance rules. Other manufacturer documents remain labeled as not retrieved.

The reader follows the publisher's observed public document-lookup operation, accepts only the expected Piper S3 path, refuses redirects, bounds response sizes and checks the pinned PDF hash. No FAA credentials go to Piper or S3. Changed metadata or bytes cause the review job to stop. These are dated review snapshots, not continuous publisher-file monitoring. The UI preserves the AD-cited 1197B edition while noting that Piper's catalog also lists 1197E; it does not silently substitute the newer edition.

## Profile and graph behavior

Serial matching now supports exact hyphenated and plain numeric formats, inclusive endpoints and explicitly encoded singleton ranges. Prefix, digit width and gaps remain significant. The two reviewed PA-28-181 AD tables end at different plain-number serials; a profile can therefore match one and be outside the other's reviewed range. Outside-range filters still preserve unknown configuration relevance.

The AD requiring a dated SA2660CE installation and incorporation of SB98-1 has no automatic serial rule. Reporting that the STC is installed does not establish its installation date, service changes or AD applicability. STC approval scope itself does not confirm installation or compliance. The original SA2660CE table prints `PA-181` for one Archer II row; that text is not silently corrected into an automatic eligibility rule. The explicit PA-28-181 row and its limits remain the cited scope.

The Nodes view adds **Find a node**, which searches within the current model/type filters and focuses the selected result without deleting other graph content. Node selection exposes incident connections; selecting an edge opens its exact source evidence. Search, drag, zoom, keyboard-accessible connection lists and mobile controls remain available. Publisher links appear separately from the AD's cited archived PDF.

## Operation, validation and remaining work

```powershell
npm.cmd run review:batch3
```

Use private worker configuration after current metadata has been imported. The job verifies publisher files, archives four FAA originals and three HTML attachments, then invokes the service-only atomic review. Repeating the hosted review preserved 71 graph rows without duplicates. The schema is applied locally and hosted; additional source archives and reviewed data were imported into the hosted catalog. Local source data was not expanded.

Validation passed: 67 frontend/domain tests, 22 worker tests, PostgreSQL review/access checks, lint, types and production build. Browser checks cover serial boundaries, conditional relevance remaining unknown, shared AD/STC/engine paths, publisher links, supersession PDF pages, node search, dragging, review coverage, existing profiles and mobile layout. The new source and mobile screenshots were inspected.

Daily FAA metadata checks remain enabled. Manufacturer-file freshness, the unreviewed referenced documents, fuller aircraft configuration and wider applicability coverage remain future work. Beta accessibility/content/release review is still required; the website remains unpublished.
