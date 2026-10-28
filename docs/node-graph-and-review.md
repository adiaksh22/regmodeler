# Node navigation and evidence review

Implemented October 14, 2026. The website remains unpublished. Hosted source data now exposes 71 model-scoped graph rows: the initial 19, then 12, 16 and 24 from subsequent review batches. Shared reference relationships appear once per supported model in the database view and once as a directed edge in the combined node canvas. Twenty AD/STC model connections have reviewed evidence; other FAA index matches remain candidates.

## User workflow

Open TCDS 2A13, select PA-28-140 or PA-28-181, then select **Relationships > Nodes**. The original Graph and List views remain available. Select a node to see its incident connections, or use **Browse node** to focus it. Select a connection or arrow for the source inspector and cited original. **Show shared relationships** includes both supported models, making shared certificates and provisions visible. The inspector states the model context of its selected connection.

Users can zoom, pan, fit and drag nodes. Moving nodes changes only local display positions; users cannot create, delete or approve regulatory relationships through the canvas. Relationship-type filters narrow the view. The connection list provides keyboard-accessible navigation alongside the canvas. Profiles remain model-specific; unknown configuration relevance stays visible.

React Flow provides the interaction and accessibility foundation; Dagre lays out the directed graph. Both load only when Nodes is opened. Canonical catalog UUIDs identify nodes, so shared certificates are not duplicated and different amendment editions are not merged because their labels resemble each other. No separate graph database is needed.

## Review coverage

The **Review coverage** tab lists current active FAA model-index candidates, prioritizing changed observations that previously had reviewed relationships, then missing primary originals and archived sources needing evidence review. Filters expose pending, reviewed, deferred and rejected records. Browsing this queue is public and read-only. It represents research coverage, not missing aircraft maintenance or compliance findings.

Operator decisions use the private worker environment:

```powershell
npm.cmd run review:decision -- <version-uuid> PA-28-140 deferred "Reason for deferral"
npm.cmd run review:decision -- <version-uuid> PA-28-140 pending
```

Operators may defer or reject unreviewed candidates; private notes are not readable through the public API. A reviewed status is derived from published, reviewed evidence for the exact active source version and model. This CLI cannot declare a source reviewed or override an existing reviewed connection.

## Additional source review

Four primary PDFs and the relevant AML were rendered and visually reviewed before adding connections. Exact reviewed hashes and excerpts are in `apps/worker/src/expanded-review.json`. Page citations use physical PDF pages. The additional sources are AD 2013-02-13, AD 2020-26-16, STC SA01941LA and STC SA4236WE. Conditions and model coverage are source-specific; the AML establishes one selected-model approval rather than extending it to every PA-28. References to manufacturer bulletins do not imply their full text has been retrieved.

```powershell
npm.cmd run review:expanded
```

The job re-fetches current scoped metadata, requires an already imported exact metadata observation, and verifies reviewed PDF hashes. A changed primary or AML refuses automatic approval. The job archives two generated AD HTML attachments as inert `text/plain` and one PDF approved model list. Generated HTML can vary between requests; it receives its actual content hash and is not used to approve graph evidence or served as executable HTML. Changed files retain their archival versions while only the latest checked attachment is active.

Attachment evidence has a composite foreign key tying it to its parent source version. The source viewer accepts an optional attachment UUID, checks the published parent, exact parent association, PDF MIME and hash-addressed path, then signs it for five minutes. It rejects HTML, wrong-parent files and arbitrary paths. Changing an active evidentiary AML hides its approval and downstream reference until evidence is reviewed again.

## Validation and limits

Review coverage now uses a single server-side search request per page, with 20 records in the interface and a database ceiling of 50. Status and document-type filters combine with literal, case-insensitive document-number/title search. Search waits 250 ms after typing; filter changes return to page one. Counts include all matching published records and a separate model-wide reviewed count, including when a search returns no rows. Late responses cannot replace a newer model or search. Failed requests offer retry. No FAA request or new import is triggered by browsing this queue. The database still evaluates the model-scoped queue to calculate exact counts; pagination bounds network payload and browser memory, rather than promising constant database cost as the catalog grows.

Hosted verification for 737-800 returned 20 of 1,067 pending candidates in approximately 11 KB per page, instead of downloading the full queue. Tests cover filtering, disjoint pages, empty-page counts, publication access, maximum page size, changed-source priority through FAA Series aliases, debounce, stale responses and retry.

Schema migrations are applied locally and hosted; additional originals and attachment data were imported into the hosted catalog. Local schema application used transactional Docker `psql` because Windows host database access remains unavailable. The local data archive was not expanded in this step.

Validation passed: 67 frontend/domain tests, 22 worker tests, embedded PostgreSQL access/integrity checks, lint, typechecking and production build. Checks cover graph identity/direction, duplicate reference rows, exact source guards, idempotent review, changed AML visibility, attachment-parent integrity and private operator access. Browser checks cover shared nodes, dragging, traversal, the cited AML PDF, review filters, profiles, mobile layout and existing source workflows. The node canvas and review queue have been visually inspected at desktop and mobile sizes. Repeating the hosted review preserved 71 graph rows without duplicate connections.

Daily AD/STC jobs currently reconcile metadata observations. Attachment retrieval and review remain operator-driven; silent PDF/attachment byte changes without changed metadata are not promised to be detected daily. Most discovered sources and exact historical regulation editions still need review. Aircraft hours, spar replacement and maintenance-record history are not profile fields, so connections requiring those conditions remain **Configuration needs review**. There is no compliance determination, alert subscription or historical node graph yet.

Next: expand reviewed rules and aircraft configuration only where originals support them; add attachment freshness checks and actual source-content comparisons; complete beta accessibility/content review before deciding to publish.

See [PA-28 review batch 2](pa28-review-batch2.md) for additional model-specific references, final-publication provenance and remaining coverage.

See [fuel-system and airframe review](pa28-fuel-airframe-review.md) for serial-specific scope, supersession, publisher links and graph search.
