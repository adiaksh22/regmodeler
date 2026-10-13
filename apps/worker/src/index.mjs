import { checkWorker, readWorkerConfig } from './check.mjs';

try {
  console.log(JSON.stringify(await checkWorker(readWorkerConfig(process.env))));
} catch {
  console.error('Worker check failed. Verify the server configuration, migrations, and database connectivity.');
  process.exitCode = 1;
}
