import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {join} from 'node:path';
const headers=await readFile('public/_headers','utf8');
assert.equal(await readFile('dist/_headers','utf8'),headers,'Pages headers must be packaged in dist');
for(const directive of ['X-Content-Type-Options: nosniff','Referrer-Policy: no-referrer','X-Frame-Options: DENY',"frame-ancestors 'none'","object-src 'none'"]){assert.ok(headers.includes(directive),`Missing static response policy: ${directive}`);}
await access('dist/index.html');
await assert.rejects(access('dist/404.html'),'Keep Cloudflare Pages SPA fallback for direct client routes');
for(const file of await readdir('dist/assets'))if(file.endsWith('.js')){
 assert.ok(!(await readFile(join('dist/assets',file),'utf8')).includes('browser-fixture.invalid'),'The isolated browser fixture bundle must never be the release bundle');
}
console.log('Release assets passed: static response headers, SPA entry/fallback and no browser-fixture backend. Deployed headers/routing still require verification.');
