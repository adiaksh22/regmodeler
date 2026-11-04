# Boeing family overview and arrow correction

Reviewed November 3, 2026. The user requested properly connected arrows and a family-wide model/certification view.

## Coverage

Physical PDF page 1 of [FAA A16WE Revision 82](https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID161888576820261020201007.0001), dated October 20, 2026, explicitly lists 17 models under the type certificate. The archived original was visually inspected, and its SHA-256 is `c61c215805c4210a6b6cd135099d41bb6dc244c72ee603de8bd512f75f964368`. A current scoped FAA metadata/PDF check matched that exact original before promotion.

The additional review establishes family membership and TCDS identity for the ten models that lacked reviewed graph coverage. It adds 20 page-1-cited paths, preserving the seven variants' existing model-section citations. The complete TCDS graph has 17 models, 34 membership/certificate paths and seven reviewed engine paths. Technical profiles remain at seven variants and 49 facts. AD/STC discovery and monitoring scope are unchanged.

The graph connects sibling models through the shared Boeing 737 family and A16WE nodes. It does not invent direct derivative/approval links between individual models. Additional certification-basis, configuration or model-derivative relationships require their own source review.

## Import and access boundaries

Migration `20261103000300_boeing_family_index.sql` defines a service-only review function. It requires the exact current original URL, date, revision, PDF hash and complete 17-model metadata set. The worker also checks the private archived PDF bytes. Repeating the review adds no duplicates; existing detailed citations and technical profiles remain unchanged. A later current source suspends the existing graph through the existing current-version view rules.

```powershell
npm.cmd run review:boeing:index -- --verify-only
npm.cmd run review:boeing:index
```

Use the correct worker environment for hosted writes. Browser clients cannot invoke the review function. Only one current FAA PDF is checked; this does not crawl historical FAA records.

## Interface

The Boeing node map defaults to the complete reviewed family scope. Focusing its family node retains members and their shared TCDS/engine paths. The model selector still controls facts and related-record context; users can turn off the family network to inspect only that model. The coverage explanation distinguishes index relationships from deeper technical review.

Nodes are simple circles. Edge endpoints are calculated by intersecting the center-to-center direction with each visible circle boundary. Arrow-marker tips align with those endpoints, including on selected nodes and while dragging. A grouped family layout keeps model nodes between the family and shared certification sources; other focused neighborhoods keep the radial layout.

`scripts/family-graph-smoke.cjs` checks all 17 models, all 41 TCDS paths, rendered endpoint distances, marker-tip alignment, dragged-node tracking, source citations and mobile width. Geometry tests cover horizontal, vertical and diagonal directions; database tests cover private access, exact-source rejection, idempotence and unchanged profiles.
