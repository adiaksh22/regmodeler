# Scoped FAA query quarantine

The discovery importer accounts for every record in a complete, bounded FAA query. A record can pass the FAA's independent certificate and model filters without supporting the exact certificate/model tuple needed by RegModeler. Such a record is retained as **scope unconfirmed**, rather than stopping every valid update or being silently discarded.

## Boundaries

- This exception applies only to STC discovery records that contain the requested certificate and a requested source-model label in the independent FAA arrays, but have no accepted tuple association. Unrelated records, invalid URLs/statuses/dates, duplicates, changed page totals, incomplete pages and exceeded scope ceilings still reject the query.
- Strict source-review callers of `collectRelated` retain the existing exact-match behavior. The discovery importer explicitly opts into unconfirmed-record accounting. No new aircraft family or FAA-wide query is introduced.
- Exact matches are model-index **candidates**, not proof of applicability, installation approval or compliance. Unconfirmed records receive no model match or reviewed graph connection.

## Archival and transaction

All returned raw metadata is archived privately using its SHA-256 hash. No STC PDFs are fetched by discovery. `source_query_quarantine` retains the source key, exact FAA identity, document number, hash/path, observed status/date, reason and last-seen run. Earlier hashes remain stored; only the latest returned hash for an identity is active. Raw rows and the coverage table have no visitor access.

The service-only `commit_related_query` transaction validates the inventory, source/run scope, identity uniqueness, archive paths and record ceilings. It updates quarantine, commits accepted candidates, suspends old model matches for unconfirmed identities, and stores coverage counts together. Failure rolls back all database changes; privately uploaded metadata is not a partial catalog import.

Coverage obeys:

`returned records = exact-match candidates + scope-unconfirmed records`

These are query-record counts, including current and historical observations, rather than unique certificates or aircraft approvals. The public `source_monitoring_coverage` RPC exposes only aggregate counts and their full-query timestamp alongside check health. It does not expose private raw quarantine rows or operator notes.

## Change tracking

An identity still returned with unconfirmed scope is not “missing from index.” Its last trusted observation remains stored separately, while its old active model matches are suspended. A subsequent complete query that truly omits that identity can record an index-absence event. Index absence itself does not establish withdrawal.

When corrected metadata provides a valid tuple, the identity leaves active quarantine and enters the candidate catalog. Changed metadata creates a new source version, and old reviewed evidence is not automatically approved for that new version. Exact unchanged previously reviewed source observations may retain their existing evidence only when the same trusted identity/hash and active match are restored.

Daily overlap checks compare both accepted observations and active quarantine hashes. Unchanged unconfirmed records do not force repeated full reconciliation. A changed hash, new identity or transition between accepted and unconfirmed scope triggers a complete bounded query. Weekly reconciliation still covers undated records and removals.

## User presentation and verification

A successful recent check with unresolved records is shown as **Checked with scope gaps**, with returned/accepted/unconfirmed counts and the date those counts were established. The timestamp of a daily unchanged heartbeat is separate from the full-query coverage timestamp. Failure and overdue states still take precedence; old counts do not turn a failed check into success.

Read-only FAA verification on November 3 returned 857 PA-28 STC records: 849 exact-match candidates, eight unconfirmed records and 49 records without modification dates. See the earlier [monitoring audit](monitoring-audit.md) for the observed tuple examples. The underlying disputed scope remains unresolved; no approval claim was added for those eight records.

Hosted reconciliation completed with those same counts and 1,416 accepted model matches. The follow-up daily check read two overlap records with no reconciliation. This restores valid scoped updates without claiming complete applicability coverage. Local checks passed 95 frontend tests, 40 worker tests, database lifecycle/access/transaction checks, lint, types and build. Hosted browser checks verified aggregate counts, model/type filtering, scope-gap disclosure in aircraft detail, lazy history and mobile layout.

Tests cover strict review, broad-query eligibility, quarantine hash changes and recovery, complete paging, private tables/service-only writes, idempotence, old-path suspension, real disappearance versus unconfirmed scope, corrected-version review boundaries, all-quarantined inventories and visible aggregate coverage. The website remains unpublished.

Implementation commit `f9e9637` passed [GitHub quality checks](https://github.com/adiaksh22/regmodeler/actions/runs/41718504049). The [manual daily workflow](https://github.com/adiaksh22/regmodeler/actions/runs/41718582934) then passed all six PA-28/Boeing TCDS, AD and STC source checks on that exact commit. Scheduled checks remain enabled; a successful run preserves the explicit unconfirmed-scope warning.
