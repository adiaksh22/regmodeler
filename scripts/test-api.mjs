import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, VITE_SUPABASE_PUBLISHABLE_KEY: publicKey } = process.env;
if (!url || !secret || !publicKey || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('API verification requires the local Supabase environment; it refuses remote projects.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, options);
const reader = createClient(url, publicKey, options);
const entityId = randomUUID();
const documentId = randomUUID();
const filePath = `verification/${randomUUID()}.txt`;
const users = [];
try {
  const { data, error } = await reader.rpc('search_tcds', { search_query: 'PA-28', result_limit: 20 });
  assert.equal(error, null);
  assert.deepEqual(data.map(row => row.tcds_number), ['2A13']);
  assert.ok((await reader.from('documents').insert({ authority: 'FAA', document_type: 'TCDS', document_number: 'DENIED', title: 'Denied' })).error);
  assert.ok((await reader.from('ingestion_checkpoints').select('*')).error);
  assert.equal((await admin.from('documents').insert({ id: documentId, authority: 'FAA', document_type: 'TCDS', document_number: `TEST-${documentId.toUpperCase()}`, title: 'Unpublished verification record' })).error, null);
  assert.deepEqual((await reader.from('documents').select('id').eq('id',documentId)).data, []);

  assert.equal((await admin.from('catalog_entities').insert({ id: entityId, authority: 'FAA', entity_type: 'aircraft_model', natural_key: `verification-${entityId}`, label: 'Temporary verification fixture', is_published: true })).error, null);
  const password = randomUUID() + 'aA1!';
  const clients = [];
  for (let i = 0; i < 2; i++) {
    const email = `verification-${randomUUID()}@example.test`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    assert.equal(created.error, null);
    users.push(created.data.user.id);
    const client = createClient(url, publicKey, options);
    assert.equal((await client.auth.signInWithPassword({ email, password })).error, null);
    clients.push(client);
  }
  assert.equal((await clients[0].from('watchlists').insert({ user_id: users[0], entity_id: entityId })).error, null);
  assert.equal((await clients[0].from('watchlists').select('*')).data.length, 1);
  assert.deepEqual((await clients[1].from('watchlists').select('*')).data, []);
  assert.ok((await clients[1].from('watchlists').insert({ user_id: users[0], entity_id: entityId })).error);

  assert.equal((await admin.storage.from('regulatory-sources').upload(filePath, Buffer.from('verification'), { contentType: 'text/plain' })).error, null);
  assert.ok((await reader.storage.from('regulatory-sources').download(filePath)).error);
  assert.equal((await admin.storage.from('regulatory-sources').download(filePath)).error, null);
  console.log('Local API checks passed: public search, denied catalog writes, hidden drafts/importer state, authenticated private watchlists, private source downloads.');
} finally {
  for (const id of users) await admin.auth.admin.deleteUser(id);
  await admin.storage.from('regulatory-sources').remove([filePath]);
  await admin.from('catalog_entities').delete().eq('id',entityId);
  await admin.from('documents').delete().eq('id',documentId);
}
