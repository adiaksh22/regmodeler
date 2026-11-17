# Application backup and recovery

Verified November 16, 2026 (drill report November 17 UTC). This is a private application backup, with a verified second ZIP in the owner's Google Drive folder. It is not a complete Supabase platform/account backup; remote cloud sync has not been independently confirmed.

## Verified export and drill

The linked project's actual `public` schema and data were exported through the authenticated Supabase CLI. All 4,250 objects in the private `regulatory-sources` bucket were copied separately and SHA-256 checked: 100,563,243 source-file bytes. SQL dumps and the manifest add approximately 12 MB. No FAA API requests or new FAA imports were made. The project's Auth user count was zero; the exporter refuses to call an application-only export complete if Auth accounts exist.

The verified local directory is `.artifacts/backups/2026-11-17T02-32-26.380Z/`. It contains `schema.sql`, `data.sql`, `manifest.json`, content-addressed `objects/` and `restore-report.json`. These private files are ignored by Git and must never be uploaded as public CI artifacts. They can include unpublished source observations and private review notes. Credentials and provider settings are not exported.

The drill restored 23 application tables and 18,558 rows into a fresh database in a disposable PostgreSQL 17 container with **no network and no published ports**. The database was created from `template0` to avoid copying Supabase template-extension internals. Minimal Auth identity infrastructure represents the application's foreign-key boundary; a real Auth service and Storage API were not recreated. Data COPY handles the circular documents/version pointers with replication triggers suspended only inside this disposable database. The drill then explicitly checks every application foreign key, every table's row count and all 136 referenced original paths/hashes; it does not rely on already-valid constraint flags.

Restored graph results were PA-28: 136 paths across two models; Boeing: 69 paths across 17 models, including 41 TCDS paths and the selected 28 AD/STC paths. The same graph inventory was verified under the anonymous reader role. The container and its disposable volumes were removed after verification. Archived bytes were verified from the backup, not fetched from the live bucket during the drill. Repeated drills keep timestamped reports plus a latest `restore-report.json`.

This snapshot precedes `20261116000200_source_viewer_budget.sql`. Its manifest records the exact applied migration versions. Recovery to the current application also requires applying that subsequent reviewed migration and redeploying the source-viewer function from Git. Signing counters are operational state and may start fresh; the reviewed default remains 60/minute and 1,000/UTC-day. Do not run recovery SQL against the live project to test it.

## Repeatable commands

Docker Desktop/Engine must be running and the existing Supabase CLI login/project link must be valid. The exporter checks the supplied reference matches the link, uses temporary CLI login credentials for dumps, and obtains the server key only in process memory for private archive download. It suppresses private command output.

```powershell
npm.cmd run backup:project -- --project-ref=rmviosdekduffvzfbhnk
npm.cmd run backup:drill -- .artifacts/backups/<verified-directory>
```

The export uses one consistent data dump, bounded folder/object inventory and eight archive-download workers. Limits are 10,000 objects and 2 GiB total archive bytes; a limit, interrupted download or hash mismatch fails the export. An incomplete directory has no verified manifest. To resume an interrupted export, pass its existing directory:

```powershell
npm.cmd run backup:project -- --project-ref=rmviosdekduffvzfbhnk --resume=.artifacts/backups/<incomplete-directory>
```

Resume preserves the SQL snapshot and reuses only locally verified content-addressed bytes. Completed backups cannot be resumed/overwritten. The exporter checks remaining object bytes before writing the manifest. Schema changes must be held stable during the separate schema/data export steps; avoid exporting during migrations or scheduled source reconciliation. A failed drill stores private diagnostics in `restore-error.log`; do not paste those logs into public issues. Filesystem hashes detect corruption, not malicious replacement of both data and its manifest.

## Off-site and full-platform recovery

A local copy on the same computer is not protection from losing that computer. At the owner's request a second copy was saved as `I:\My Drive\RegModeler Backups\regmodeler-2026-11-17T02-32-26.380Z.zip` (60,044,521 bytes), with a neighboring `.zip.sha256` file. Its SHA-256 matches the local ZIP, and all 4,252 internal SQL/object files match the verified manifest's hashes. ZIP SHA-256: `9dcb6236cf2c076cca8b1c12012deca0b1fee4815ed709a39cba23c5de55f83f`. Windows ZIP entry separators are supported by Windows extraction. Extract into a new private directory under `.artifacts/backups` before running the drill.

The Drive folder copy is verified; the owner must confirm Google Drive reports sync complete and the ZIP is available on the Drive website before treating it as off-site protection. No scheduled transfer or retention policy is configured. Keep the folder private. Do not put raw backup files in the public GitHub repository, Pages assets or public workflow artifacts.

Repeat the export after material source imports/reviews or schema changes, and run a restore drill before relying on a new recovery procedure. Record retention and a recurring backup owner once the destination is selected; manual local exports do not provide a guaranteed recovery-point objective.

The drill does not verify a newly provisioned hosted Supabase project's Auth/Storage services, provider backup retention, function secrets, billing controls or notification delivery. Browser profiles/notes remain on each user's browser and are not in this server backup. If accounts are introduced, replace the zero-Auth-user guard with a reviewed Auth backup/restore process before relying on this export.

Supabase documents [database export/backups](https://supabase.com/docs/guides/platform/backups) and [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Database dumps do not contain Storage object bytes; this procedure exports them separately.
