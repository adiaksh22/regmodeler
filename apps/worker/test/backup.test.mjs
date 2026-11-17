import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {copyCounts,sha256,verifyBackup} from '../../../scripts/backup-artifacts.mjs';
const data='COPY public.documents (id, title) FROM stdin;\n1\tline\\ncontinued\n\\.\n';
test('COPY inventory preserves escaped fields and refuses partial/duplicate tables',()=>{
 assert.deepEqual(copyCounts(data),{documents:1});assert.throws(()=>copyCounts(data.slice(0,-4)),/Truncated/);assert.throws(()=>copyCounts(data+data),/Duplicate/);
});
test('backup verification detects altered SQL/object bytes and refuses unsafe object paths',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'regmodeler-backup-'));
 try{
  await mkdir(join(directory,'objects'));const bytes=Buffer.from('Fixture archive');const hash=sha256(bytes);
  await writeFile(join(directory,'schema.sql'),'schema');await writeFile(join(directory,'data.sql'),data);await writeFile(join(directory,'objects',hash),bytes);
  const manifest={schemaVersion:1,project:'rmviosdekduffvzfbhnk',files:{'schema.sql':{sha256:sha256('schema')},'data.sql':{sha256:sha256(data)}},tableRows:{documents:1},objects:[{path:'FAA/test',file:`objects/${hash}`,sha256:hash,bytes:bytes.length}]};
  const save=()=>writeFile(join(directory,'manifest.json'),JSON.stringify(manifest));await save();await verifyBackup(directory);
  await writeFile(join(directory,'objects',hash),'changed');await assert.rejects(verifyBackup(directory),/Archive bytes/);await writeFile(join(directory,'objects',hash),bytes);
  manifest.objects[0].file='../outside';await save();await assert.rejects(verifyBackup(directory),/Invalid archive/);manifest.objects[0].file=`objects/${hash}`;await save();
  await writeFile(join(directory,'data.sql'),data+'changed');await assert.rejects(verifyBackup(directory),/SQL hash/);
 }finally{assert.ok(directory.startsWith(join(tmpdir(),'regmodeler-backup-')),'Only the created test directory may be removed');await rm(directory,{recursive:true,force:true});}
});
