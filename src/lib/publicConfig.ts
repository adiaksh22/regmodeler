export interface PublicConfig { url: string; publishableKey: string }

export function validatePublicEnvironment(env: Record<string, string>): PublicConfig | null {
  const allowed = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
  if (Object.keys(env).some(name => name.startsWith('VITE_') && !allowed.has(name))) {
    throw new Error('Unexpected public environment variable. Only the Supabase URL and publishable key are allowed; keep server secrets unprefixed.');
  }
  return readPublicConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
}

export function readPublicConfig(url = '', key = ''): PublicConfig | null {
  if (!url && !key) return null;
  if (!url || !key) throw new Error('Set both public Supabase URL and publishable key, or leave both empty for demo mode.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('Supabase URL must use HTTPS, except for local development.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Supabase URL must not contain credentials or query parameters.');
  if (key.startsWith('sb_publishable_') && !/\s/.test(key)) return { url: parsed.origin, publishableKey: key };
  // Legacy anon JWTs remain valid public keys; service-role JWTs must never reach browsers.
  try {
    const parts = key.split('.');
    const payload = JSON.parse(atob(parts[1].replaceAll('-', '+').replaceAll('_', '/'))) as { role?: string };
    if (parts.length === 3 && payload.role === 'anon' && !/\s/.test(key)) return { url: parsed.origin, publishableKey: key };
  } catch { /* Report a generic error without repeating any credential. */ }
  throw new Error('Use a public Supabase publishable/anon key. Server secret and service-role keys are not allowed in frontend configuration.');
}
