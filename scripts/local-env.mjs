import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const target = new URL('../.env.local', import.meta.url);
if (existsSync(target)) throw new Error('.env.local already exists. Keep its contents; configure the local public/server values using the local Supabase dashboard.');
const cli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
const status = JSON.parse(execFileSync(process.execPath, [cli,'status','--output','json'], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }));
const url = status.API_URL;
if (!url || !new URL(url).hostname.match(/^(127\.0\.0\.1|localhost)$/)) throw new Error('Local environment generator refuses a remote project.');
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!publicKey || !secret) throw new Error('Local Supabase status did not contain the required keys.');
writeFileSync(target, `# Local development credentials generated from local Supabase only.\nVITE_SUPABASE_URL=${url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${publicKey}\nSUPABASE_URL=${url}\nSUPABASE_SECRET_KEY=${secret}\nFAA_DRS_API_KEY=\n`, { flag: 'wx' });
// Ensure examples document every required field without printing any values.
if (!readFileSync(new URL('../.env.example', import.meta.url),'utf8').includes('SUPABASE_SECRET_KEY=')) throw new Error('Example configuration is incomplete.');
console.log('Created ignored .env.local for the local Supabase stack. No credentials were printed.');
