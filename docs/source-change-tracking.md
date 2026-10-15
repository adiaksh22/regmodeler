# Source-change tracking

Implemented October 14, 2026. The shared feed tracks successful source observations for PA-28-140 and PA-28-181. It is separate from the browser prototype log and from edits to aircraft profiles.

## Observations and events

The first complete import for each scope establishes a baseline without generating discovery events for historical records. Later complete imports can record first discovery after baseline, changed metadata/source status, changed TCDS PDF bytes, disappearance from the scoped index, or return to that index. Index absence is not regulatory withdrawal. Detection time is not issuance or effective time. AD/STC checks currently monitor metadata; their primary PDF bytes are not routinely checked.

Source observations and events are committed in the same transaction as the source batch and checkpoint. Failed, incomplete or stale imports retain prior state. Repeating an unchanged import creates no event. Stable source identity is distinct from an immutable observation version. Events preserve old/new evidence IDs and observed source statuses, even when the catalog's current pointer changes.

The public feed requires both referenced snapshots and their documents to remain published. Internal observation tables, core commit functions and run errors are private. Before/after cards expose a limited set of stored metadata fields and their fingerprints. They do not claim to identify changed regulatory wording. FAA record addresses may resolve to later content; stored snapshots provide the historical comparison. TCDS events also link privately archived PDFs through the publication-checked viewer.

## Relationship accuracy

Reviewed graph edges continue to depend on the current TCDS snapshot or active current AD/STC observation. A corrected or unpublished source does not automatically inherit the prior reviewed graph paths. Profile relevance is evaluated only against those reviewed paths. Feed events link back to the model explorer and explicitly flag possible renewed review; they do not declare a source change applicable to every aircraft.

## Monitoring and schedule

The user selected daily checks and an in-app feed first; email alerts are deferred. The **Daily FAA source check** requests only records newer than each source checkpoint, with a one-day overlap. Known unchanged overlap records produce a zero-write freshness heartbeat. A new identity, changed metadata, changed status or returned record triggers a complete scoped reconciliation. The **Weekly FAA source reconciliation** performs a complete pass so undated STCs and records missing from the index are still detected. Both jobs share one concurrency group; each source commits independently.

The importer has explicit family/type record ceilings and fails closed if an FAA result unexpectedly exceeds them. Current automated scope is limited to exact PA-28 and Boeing 737 model/certificate filters; it does not crawl the FAA archive or widen itself when new families appear.

Daily cron is `17 13 * * *`; weekly reconciliation is `47 13 * * 0`. GitHub scheduled runs can be delayed; these are freshness targets rather than guaranteed delivery times. See [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

**Daily automation is enabled.** On October 14, 2026, the user explicitly approved storing the existing FAA key and hosted Supabase worker secret as encrypted GitHub Actions repository secrets in `adiaksh22/regmodeler`. The three worker settings were configured privately. [Manual hosted run 38627726297](https://github.com/adiaksh22/regmodeler/actions/runs/38627726297) succeeded for the initial PA-28 TCDS, AD and STC checks. Repository variable `SOURCE_CHECKS_ENABLED=true` was then set and verified. On October 15, the hosted baseline expanded to A16WE plus 418 Boeing AD and 2,601 Boeing STC records; the public monitoring RPC reports successful, baseline-ready Boeing checkpoints.

Worker secrets are `FAA_DRS_API_KEY`, hosted `SUPABASE_URL`, and hosted `SUPABASE_SECRET_KEY`. Values were encrypted with the repository public key before transfer; none were saved in source files or frontend configuration. The privileged Supabase key bypasses visitor access restrictions, so it belongs only in controlled backend jobs. See [Supabase key permissions](https://supabase.com/docs/guides/getting-started/api-keys). To pause scheduled worker jobs, set `SOURCE_CHECKS_ENABLED=false`; manual dispatch remains available. Secret rotation must update the corresponding protected worker setting and be followed by a manual verification run.

The feed exposes the last successful check, latest database-recorded attempt status and baseline readiness. Errors do not become “no changes.” Configuration failures occurring before a worker can start a database run must also be investigated in GitHub Actions. A successful unchanged check is freshness, not proof of complete applicability coverage.

## Validation

The hosted baseline passed: 23 TCDS revisions, 58 AD observations, 856 STC observations; all three baselines are established, zero initial events, and 19 reviewed connections preserved. No fabricated change events are inserted into the hosted database.

Database tests cover baseline semantics, corrections, repeated imports, no-change heartbeats, bounded public paging, rollback, disappearance/return, immutable observed statuses, publication of both sides and private core functions. Worker tests cover overlap deduplication and TCDS/related delta decisions. Browser tests check the live empty baseline and a mocked before/after event, model navigation, mobile layout, profiles and outages.

Both migrations are applied to hosted and local databases. Local Windows host-port access failed despite healthy containers, so the local migrations were applied transactionally through Docker `psql` and recorded in `supabase_migrations.schema_migrations`. This does not reset existing data.

The additional node view, read-only review queue and selected attachment retrieval are now implemented; see [node navigation and review coverage](node-graph-and-review.md). The next source-quality work is broader reviewed applicability rules, automatic attachment freshness and actual content comparisons. Notification subscriptions require a separate identity/preference design. The website remains unpublished.
