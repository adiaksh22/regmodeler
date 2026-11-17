import {appendFile} from 'node:fs/promises';
const status=process.env.SOURCE_JOB_STATUS;
if(!['success','failure','cancelled','skipped'].includes(status))throw Error('Missing source job outcome');
const destination=process.env.GITHUB_STEP_SUMMARY;
if(!destination)throw Error('GitHub summary file unavailable');
await appendFile(destination,`## FAA source checks: ${status}\n\n${status==='success'?'The configured source steps completed. Check per-source timestamps and review boundaries before interpreting a change.':'Inspect failed steps and the application’s source-check health panel. A failed or cancelled check does not mean there were no FAA changes. Previous successful timestamps and reviewed evidence remain distinct.'}\n\nScheduled start times and email delivery are not guaranteed. The repository owner should enable and verify Actions failure notifications in GitHub notification settings. No keys, private source rows or error payloads are included here.\n`);
