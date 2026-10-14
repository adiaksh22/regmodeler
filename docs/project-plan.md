# RegModeler product and delivery plan

Updated October 14, 2026. This is the main project plan. It separates completed features, proposed work and unresolved decisions; supporting documents contain implementation details.

## Purpose and scope

Help aircraft owners and maintenance professionals find regulatory sources, understand their connections and identify changes worth reviewing for a specific aircraft. Start with FAA general aviation: Piper PA-28-140 and PA-28-181 under TCDS 2A13. Later expand to other GA families, commercial aircraft, engines, propellers, appliances and additional authorities.

Users can browse model information without a profile. Profiles add user-reported aircraft details to explain selected relevance conditions. Source review, installation verification and compliance assessment remain separate activities.

## User workflows and profile use cases

| User and task | What they do | What the tool contributes |
| --- | --- | --- |
| Owner researching their aircraft | Search a model, save serial/modification details, select graph connections and read cited originals | Reusable aircraft context and explanations of reviewed conditions |
| Maintenance professional preparing a review | Select the intended aircraft, inspect current/history AD/STC records and compare source conditions with aircraft records | Organized sources, exact evidence and unresolved questions |
| Prospective buyer organizing research | Record supplied aircraft details and identify source material to discuss with a seller or maintenance professional | Research context; seller-supplied details remain unverified |
| User managing several aircraft | Keep separately named profiles and switch between them | Avoid repeated entry and prevent one model's profile from being applied to another |
| Future user monitoring changes | Subscribe to model/aircraft source changes and investigate new events | Planned traceable change feed and later explicit notifications |

The normal workflow is: search model -> open certificate family -> select/create profile -> browse graph or related records -> inspect relevance and unknowns -> open the source excerpt and cited PDF -> use the original material in the user's review process.

The current app does not record maintenance performed, sign off work or determine compliance. Prospective-buyer and multi-aircraft uses build on existing profiles; there is no dedicated inspection or team-management workflow yet.

## Profile behavior today

Profiles support PA-28-140 and PA-28-181. Fields are a name, optional manufacturer serial, STC numbers, installation status (installed, not installed or unknown) and optional record-reference notes. Saving applies a draft; unsaved edits do not change relevance. Users can keep multiple profiles, select them independently by model, delete them and export JSON.

| Profile information | Current use | Remaining uncertainty |
| --- | --- | --- |
| Model | Selects scoped discovery and the reviewed model graph | Other models' unreviewed coverage |
| Serial | Compared with reviewed structured serial ranges where available | Other conditions, prior work, compliance and unsupported formats |
| STC installation entry | Labels reviewed approval connections with user-reported installation | Verified installation, compatibility and design-data rights |
| Missing fields/unlisted STCs | Keeps relevance unknown | Requires investigation, not an assumption of absence |
| Record-reference note | Preserves user context | No uploaded-record verification or maintenance sign-off |

The first reviewed serial example is the AD 2020-24-05 connection. Most discovered records have no reviewed configuration rule. Filters hide only records outside reviewed serial ranges; unknowns remain visible. Historical observations without corresponding reviewed current evidence do not receive current configuration rules.

Profiles stay in this browser/device, need no account and are not uploaded. Clearing browser storage removes them. JSON export provides a backup; import is not implemented. Future private accounts would allow cross-device profiles, watchlists and notification preferences. An account would not make self-reported details verified. See [aircraft profiles](aircraft-profiles.md).

## Current delivery status

| Area | Implemented | Remaining |
| --- | --- | --- |
| Foundation | Active/archive separation; repeatable lint, tests, types and build | Ongoing maintenance |
| Infrastructure | GitHub; local/hosted Supabase; migrations; private archives; controlled public API and PDF viewer | Release operations, recovery and monitoring |
| TCDS | 23 imported 2A13 revisions with original PDFs/metadata; repeat imports verified | Additional attachments and aircraft families |
| Related discovery | Metadata for 58 AD, 856 STC and 59 CAR records in the selected scope; pagination/incremental checks | Most primary PDFs/attachments, wider scope and unattended operation |
| Regulatory sources | Reviewed CAR baseline/amendment scans; seven dated 2016 CFR reference sections | Complete cited historical wording and production current-text connector |
| Relationships | 19 reviewed connections; directed graph/list; AD-to-service-bulletin traversal | More reviewed paths, relation filters and historical graph exploration |
| Interface | Model-first search; cited evidence/PDFs; current/history filters; revision metadata/PDF comparison | User feedback, accessibility audit and actual content-change summaries |
| Profiles | Named browser profiles; unknowns; reviewed serial labels; reported installation | Backup import, additional rules and optional private accounts |
| Changes/alerts | Immutable source snapshots, checkpoints and manual workflows | Scheduling, shared change events, watchlists and notifications |
| Publication | Cloudflare account and build setup selected | Website remains unpublished; beta review/release decision pending |

Counts describe validated scoped observations, not complete FAA coverage or a fully reviewed applicability catalog. CAR scans and the 2016 reference edition do not form the full cited historical basis or today's regulation. Browser prototype history is separate from official imported source history.

## Architecture and sources

Chosen portfolio target: Cloudflare Pages frontend, Supabase PostgreSQL/private storage/controlled APIs, GitHub Actions server-only imports. Aim to remain within ordinary free allocations; check usage, availability and operating costs before publication or expansion. Student-pack benefits are optional.

React/TypeScript lives in `src/`; server-only jobs in `apps/worker/`; versioned backend changes in `supabase/migrations/` and `supabase/functions/`. PostgreSQL stores canonical identities, source versions and typed relationships. No separate graph database is needed for the initial workload. Archived research is excluded from the active app.

| Source | Retrieval/preservation strategy | Purpose |
| --- | --- | --- |
| FAA DRS TCDS | Authenticated filtered TCDSMODEL API; immutable PDF and canonical metadata | Certificates, model coverage, history and certification-basis citations |
| FAA DRS AD | Scoped ADFRAWD API; distinguish emergency sources; archive observations and reviewed originals | Discovery, conditions, supersedence and service-document paths |
| FAA DRS STC | Associated certificate/model tuples; retain current and historical observations | Approval discovery; review AMLs and limitations before asserting further scope |
| FAA DRS CAR | Filter CAR 3; establish identity from dated originals, not amendment number alone | Historical basis originals and later reviewed text |
| GovInfo | Publisher XML and original publications with edition identity/fingerprints | Dated regulatory text and publication evidence |
| eCFR/Federal Register | Feasibility access checked; production connectors/edition mapping remain to build | Current dated reference text and rulemaking/change context |
| Manufacturer/service material | Preserve reference identity; retrieve when access/reuse terms allow | Referenced material; missing full text remains explicit |

Retain authority, stable identity, revision/effective dates, retrieval time, original sources, page/section evidence, conditions and review status. Approval scope and actual installation are separate relationships. Credentials stay in protected worker configuration. Browser source reads use public configuration; private originals are exposed only through publication-checked temporary PDF links. Profile data remains separate from the source catalog.

## Recommended next phase: dependable change tracking

Build a shared source-change feed for supported models before automated email delivery or broad relevance conclusions.

### 1. Establish scheduled imports

Configure repository secrets privately and complete each manual hosted workflow. Begin with daily scoped TCDS/AD/STC checks, subject to source limits and measured runtime. Retain full STC reconciliation because 49 discovered legacy records have no modification timestamp. Consider more frequent AD checks after measuring source behavior and budget. No schedule is currently enabled.

Keep retries, byte limits, pagination validation and overlap windows. Advance checkpoints only after a complete successful transaction. Failure preserves the previous valid catalog and marks freshness as stale, rather than claiming no changes. Add operator visibility for failures/interrupted runs.

Gate: a scheduled check succeeds without browser activity; repeated unchanged checks add no duplicate snapshots/events; simulated failure preserves prior valid state.

### 2. Create source-change events

Compare successful observations. Distinguish first discovery, changed metadata, changed original bytes, changed source status and records no longer returned by the scoped index. Absence is not automatically regulatory withdrawal. Keep observation time, source modification, issuance/effective date and old/new evidence IDs distinct.

Create idempotent events after committed imports. Test changed/unchanged fixtures. First ingestion is not a newly issued regulation; a different PDF fingerprint does not describe changed wording.

Gate: a controlled change creates one traceable event; repeating the run creates none; events link to source observations.

### 3. Add the shared model change feed

Show real source events alongside the clearly labeled browser prototype log. Filter by model, source type and date. Explain what changed and link old/new evidence. Keep source events separate from user profile edits.

Apply a profile relevance explanation only where supporting conditions are reviewed. Otherwise show needs review. Browser profiles alone cannot notify someone while their browser is closed; server subscriptions require a separate identity/preference design.

Gate: a user can explain what observation changed, when it was detected, which model index connects to it and what remains unknown.

### 4. Expand reviewed configuration/source coverage

Prioritize more records for the existing two models. Retrieve originals/attachments, review serial/equipment/approval conditions and attach page/section evidence. Add an operator review queue: changed sources suspend stale reviewed paths pending renewed review.

Add engine/propeller/equipment fields when reviewed rules can use them. Improve revision comparison with actual content differences and extraction limits. Retrieve exact historical amendments before calling a basis complete.

Gate: representative owner/maintenance tasks reach the needed originals and explain known/unresolved conditions.

## Subsequent phases

| Order | Phase | Deliverables and gate |
| --- | --- | --- |
| A | Optional private accounts/profile sync | Sign-in, owner-only access, deliberate local-profile migration and recovery; cross-user access tests pass |
| B | Watchlists/notifications | Explicit subscriptions, selected channels/frequency, deduplication, unsubscribe and delivery failure handling; controlled changes notify the intended user exactly once |
| C | Public beta preparation | Coverage/freshness audit, desktop/mobile/accessibility review, source/reuse terms, usage budgets, backup/recovery and monitoring |
| D | Cloudflare release | Reviewable build, domain/repository setup and post-deployment checks; publish after the user's release decision |
| E | Coverage expansion | Additional PA-28 models and selected GA families; repeat source/review gates for each expansion |
| F | Broader aircraft/authorities | Commercial and other categories/jurisdictions, preserving authority-specific identities and rule differences |

Accounts can move earlier if cross-device access becomes the main need. Notifications follow reliable change detection and explicit subscriptions. Richer diagrams, exact historical text and broader coverage can proceed incrementally with incomplete areas visible.

## Decisions still to make

Already decided: owners/maintenance professionals; FAA GA first; PA-28 first; model-first search; current-first AD/STC browsing with history; browser profiles before accounts; free portfolio target; no public prototype release yet.

Ask at the relevant implementation point:

- Change tracking: initial cadence and equal coverage for both supported models.
- Source review: which additional ADs/STCs and equipment conditions matter most.
- Accounts: sign-in method, local-profile migration and whether team sharing is needed.
- Notifications: on-site watchlists versus email/other channels, digest frequency and review-needed messaging.
- Beta: supported-model claims, access policy, domain and release readiness.
- Expansion: next aircraft family and authority after initial workflows are dependable.

## Validation and success criteria

Run checks appropriate to each change: lint, domain/frontend and worker tests, database access/transaction checks, types, production build and targeted browser checks. Current coverage includes 62 frontend tests and 17 worker tests plus database checks. Desktop/mobile source-exploration and profile checks pass; GitHub quality checks pass on the profile commit.

Measure tasks, not counts alone: users find the correct model, distinguish evidence from candidates, follow source paths, understand profile unknowns and identify traceable changes. Observe representative owners and maintenance users performing these tasks before beta and correct confusing navigation or wording.

## Supporting documents

- [Foundation and cleanup](foundation.md)
- [Free-stack setup](free-stack-setup.md)
- [TCDS import validation](pa28-ingestion.md)
- [Related sources and reviewed dependencies](related-sources.md)
- [Data presentation](data-presentation.md)
- [Aircraft profiles](aircraft-profiles.md)
- [Feasibility report](../data-feasibility/REPORT.txt)