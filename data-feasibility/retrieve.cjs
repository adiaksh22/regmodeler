const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = path.join(__dirname, 'evidence');
const targets = JSON.parse(process.argv[2].startsWith('@') ? fs.readFileSync(process.argv[2].slice(1), 'utf8') : process.argv[2]);
(async () => {
  const results = await Promise.all(targets.map(async ([name, url]) => {
    if (!/^[a-zA-Z0-9-]+$/.test(name)) throw new Error('Invalid evidence name');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'Accept-Encoding': 'gzip', 'User-Agent': 'RegModeler-DataFeasibility/0.1' } });
      const bytes = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(path.join(out, name + '.raw'), bytes);
      const result = { name, url, finalUrl: response.url, status: response.status, type: response.headers.get('content-type'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), checkedAt: new Date().toISOString(), prefix: bytes.toString('utf8').slice(0, 160) };
      fs.writeFileSync(path.join(out, name + '.receipt.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result));
      return result;
    } catch (error) { const result = { name, url, error: error.message, cause: error.cause?.code }; console.log(JSON.stringify(result)); return result; }
  }));
})();
