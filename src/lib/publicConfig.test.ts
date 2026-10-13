import { describe, expect, it } from 'vitest';
import { readPublicConfig, validatePublicEnvironment } from './publicConfig';

describe('browser credential boundary', () => {
  it('blocks accidental server-secret exports before the build', () => {
    expect(() => validatePublicEnvironment({ VITE_FAA_DRS_API_KEY: 'do_not_echo' })).toThrow(/Unexpected/);
  });
  it('uses demo mode only when both settings are absent', () => {
    expect(readPublicConfig()).toBeNull();
    expect(() => readPublicConfig('https://example.supabase.co')).toThrow(/both/);
  });
  it('accepts public keys and local API URLs', () => {
    expect(readPublicConfig('http://127.0.0.1:54321', 'sb_publishable_example')?.url).toBe('http://127.0.0.1:54321');
  });
  it('rejects server keys without echoing them', () => {
    const secret = 'sb_secret_do_not_echo';
    expect(() => readPublicConfig('https://example.supabase.co',secret)).toThrow(/not allowed/);
    try { readPublicConfig('https://example.supabase.co',secret); }
    catch (error) { expect(String(error)).not.toContain(secret); }
    const jwt = `header.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`;
    expect(() => readPublicConfig('https://example.supabase.co',jwt)).toThrow(/not allowed/);
  });
  it('rejects insecure hosted URLs and embedded credentials', () => {
    expect(() => readPublicConfig('http://example.supabase.co','sb_publishable_example')).toThrow(/HTTPS/);
    expect(() => readPublicConfig('https://user:pass@example.supabase.co','sb_publishable_example')).toThrow(/credentials/);
  });
});
