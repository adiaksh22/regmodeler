import { createClient } from '@supabase/supabase-js';

export function readWorkerConfig(env) {
  const url = env.SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error('Worker configuration missing: set SUPABASE_URL and SUPABASE_SECRET_KEY locally or in GitHub Actions secrets.');
  const parsed = new URL(url);
  if (parsed.username || parsed.password || parsed.search || parsed.hash ||
    (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['127.0.0.1','localhost'].includes(parsed.hostname)))) {
    throw new Error('Worker Supabase URL must be HTTPS or a local development URL, without embedded credentials.');
  }
  let serviceRole = false;
  try { serviceRole = JSON.parse(Buffer.from(secret.split('.')[1], 'base64url').toString()).role === 'service_role'; }
  catch { /* Modern secret keys are not JWTs. */ }
  if ((!secret.startsWith('sb_secret_') && !serviceRole) || /\s/.test(secret)) throw new Error('Worker requires a server secret/service-role key.');
  return { url: parsed.origin, secret };
}

export async function checkWorker(config) {
  const client = createClient(config.url, config.secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  const { error } = await client.from('ingestion_checkpoints').select('source').limit(1);
  if (error) throw new Error('Worker cannot access the ingestion schema. Check the server key, migrations, and connectivity.');
  return { status: 'ready', mode: 'health-check', ingestionEnabled: false };
}
