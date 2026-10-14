# Source-change tracking

Implemented October 14, 2026. The shared feed tracks successful source observations for PA-28-140 and PA-28-181. It is separate from the browser prototype log and from edits to aircraft profiles.

## Observations and events

The first complete import for each scope establishes a baseline without generating discovery events for historical records. Later complete imports can record first discovery after baseline, changed metadata/source status, changed TCDS PDF bytes, disappearance from the scoped index, or return to that index. Index absence is not regulatory withdrawal. Detection time is not issuance or effective time. AD/STC checks currently monitor metadata; their primary PDF bytes are not routinely checked.

Source observations and events are committed in the same transaction as the source batch and checkpoint. Failed, incomplete or stale imports retain prior state. Repeating an unchanged import creates no event. Stable source identity is distinct from an immutable observation version. Events preserve old/new evidence IDs and observed source statuses, even when the catalog's current pointer changes.

The public feed requires both referenced snapshots and their documents to remain published. Internal observation tables, core commit functions and run errors are private. Before/after cards expose a limited set of stored metadata fields and their fingerprints. They do not claim to identify changed regulatory wording. FAA record addresses may resolve to later content; stored snapshots provide the historical comparison. TCDS events also link privately archived PDFs through the publication-checked viewer.

## Relationship accuracy

Reviewed graph edges continue to depend on the current TCDS snapshot or active current AD/STC observation. A corrected or unpublished source does not automatically inherit the prior reviewed graph paths. Profile relevance is evaluated only against those reviewed paths. Feed events link back to the model explorer and explicitly flag possible renewed review; they do not declare a source change applicable to every aircraft.

## Monitoring and schedule

The user selected daily checks and an in-app feed first; email alerts are deferred. The prepared **Daily PA-28 source check** workflow reconciles TCDS originals, AD metadata and STC metadata, including undated legacy records. It uses a single concurrency group and a 35-minute timeout. Each source commits independently so a failed source does not invalidate another source's successful check.

Cron is `17 13 * * *` (13:17 UTC daily; 06:17 Pacific daylight time or 05:17 Pacific standard time). GitHub scheduled runs can be delayed; this is not a guaranteed exact delivery time. See [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

**Automation is not enabled yet.** Scheduled worker jobs require repository variable `SOURCE_CHECKS_ENABLED=true`. Keep it unset until the protected worker secrets are approved/configured and a manual hosted workflow succeeds. Required secrets are `FAA_DRS_API_KEY`, hosted `SUPABASE_URL`, and hosted `SUPABASE_SECRET_KEY`. Automatic approval review rejected transferring these credentials to GitHub without explicit approval for those credentials and that repository. No credentials were sent to repository secrets.

After approval: encrypt/store the three worker values through GitHub's repository-secret API, dispatch one manual run, verify counts/baselines/events and preserved reviewed paths, then enable the repository variable. Keep sensitive values out of files, logs and frontend configuration. Do not silently substitute local database credentials for hosted credentials.

The feed exposes the last successful check, latest database-recorded attempt status and baseline readiness. Errors do not become “no changes.” Configuration failures occurring before a worker can start a database run must also be investigated in GitHub Actions. A successful unchanged check is freshness, not proof of complete applicability coverage.

## Validation

The hosted baseline passed: 23 TCDS revisions, 58 AD observations, 856 STC observations; all three baselines are established, zero initial events, and 19 reviewed connections preserved. No fabricated change events are inserted into the hosted database.

Database tests cover baseline semantics, corrections, repeated imports, rollback, disappearance/return, immutable observed statuses, publication of both sides and private core functions. Browser tests check the live empty baseline and a mocked before/after event, model navigation, mobile layout, profiles and outages. The controlled browser event exists only in the isolated test response.

Both migrations are applied to hosted and local databases. Local Windows host-port access failed despite healthy containers, so the local migrations were applied transactionally through Docker `psql` and recorded in `supabase_migrations.schema_migrations`. This does not reset existing data.

The next source-quality work is broader reviewed applicability rules, attachment retrieval, an operator review queue and actual content comparisons. Notification subscriptions require a separate identity/preference design. The website remains unpublished.
