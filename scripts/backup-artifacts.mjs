import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import {join,relative,isAbsolute} from 'node:path';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function copyCounts(sql){
 const counts={};let current=null;
 for(const line of sql.split(/\r?\n/)){
  if(current){if(line==='\\.')current=null;else counts[current]++;continue;}
  const match=/^COPY "?public"?\."?([a-z_][a-z0-9_]*)"? \(.*\) FROM stdin;$/.exec(line);
  if(match){current=match[1];if(current in counts)throw Error('Duplicate COPY table');counts[current]=0;}
 }
 if(current)throw Error('Truncated COPY data');
 if(!Object.keys(counts).length)throw Error('No application COPY records');return counts;
}
export async function verifyBackup(directory){
 const root=await realpath(directory);
 const read=async file=>{const target=await realpath(join(root,file)),child=relative(root,target);if(!child||child.startsWith('..')||isAbsolute(child))throw Error('Backup file escapes its directory');return readFile(target);};
 const manifest=JSON.parse((await read('manifest.json')).toString('utf8'));
 if(manifest.schemaVersion!==1||!/^[a-z]{20}$/.test(manifest.project)||!Array.isArray(manifest.objects)||!manifest.files)throw Error('Invalid backup manifest');
 for(const name of ['schema.sql','data.sql']){
  const bytes=await read(name);if(sha256(bytes)!==manifest.files[name]?.sha256)throw Error('Backup SQL hash mismatch');
 }
 const paths=new Set();
 for(const object of manifest.objects){
  if(typeof object.path!=='string'||paths.has(object.path)||!/^objects\/[a-f0-9]{64}$/.test(object.file))throw Error('Invalid archive manifest');paths.add(object.path);
  const bytes=await read(object.file);if(bytes.length!==object.bytes||sha256(bytes)!==object.sha256||object.file!==`objects/${object.sha256}`)throw Error('Archive bytes do not match backup manifest');
 }
 const counts=copyCounts((await read('data.sql')).toString('utf8'));
 if(JSON.stringify(counts)!==JSON.stringify(manifest.tableRows))throw Error('Backup row inventory mismatch');
 return manifest;
}
