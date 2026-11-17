// Private local application export. Never logs credentials, SQL rows or source bytes.
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,writeFile,access,realpath} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {copyCounts,sha256,verifyBackup} from './backup-artifacts.mjs';
const cli=(args)=>execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args],{stdio:['ignore','pipe','pipe'],maxBuffer:8*1024*1024,timeout:180000}).toString();
try{
 const project=String(process.argv.find(arg=>arg.startsWith('--project-ref='))??'').split('=')[1];
 if(!/^[a-z]{20}$/.test(project??'')||project!==(await readFile('supabase/.temp/project-ref','utf8')).trim())throw Error('Pass the exact linked --project-ref before exporting');
 const resume=process.argv.find(arg=>arg.startsWith('--resume='))?.slice(9);
 await mkdir(resolve('.artifacts/backups'),{recursive:true});
 const root=await realpath(resolve('.artifacts/backups')),directory=resume?await realpath(resolve(resume)):join(root,new Date().toISOString().replaceAll(':','-'));
 const child=relative(root,directory);if(!child||child.startsWith('..')||isAbsolute(child))throw Error('Backup directory must stay under .artifacts/backups');
 if(!resume){await mkdir(directory,{recursive:true});await mkdir(join(directory,'objects'));}
 else {try{await access(join(directory,'manifest.json'));throw Error('A completed backup cannot be resumed');}catch(error){if(error.code!=='ENOENT')throw error;}}
 const query=sql=>JSON.parse(cli(['db','query','--linked',sql,'--output','json'])).rows;
 const auth=query('select count(*)::integer as n from auth.users')[0].n;
 if(auth!==0)throw Error('Auth accounts exist; add a complete Auth recovery plan before using this application-only export');
 console.log(JSON.stringify({phase:'database export',directory}));
 if(!resume)for(const [name,args] of [['schema.sql',[]],['data.sql',['--data-only','--use-copy']]])cli(['db','dump','--linked','--schema','public','--file',join(directory,name),...args]);
 const secret=JSON.parse(cli(['projects','api-keys','--project-ref',project,'--reveal','--output','json'])).find(row=>row.type==='secret')?.api_key;
 if(!secret)throw Error('Hosted credential unavailable');
 const client=createClient(`https://${project}.supabase.co`,secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(60000)})}});
 const bucket=client.storage.from('regulatory-sources');const files=[];const folders=[''];const visited=new Set();
 while(folders.length){
  const prefix=folders.shift();if(visited.has(prefix)||visited.size>=1000)throw Error('Archive folder inventory exceeded its bound');visited.add(prefix);
  for(let offset=0;;offset+=1000){
   const result=await bucket.list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});if(result.error)throw Error('Archive inventory unavailable');
   for(const file of result.data??[]){const path=prefix?`${prefix}/${file.name}`:file.name;if(file.id)files.push(path);else folders.push(path);}
   if(files.length>10000||offset>=10000)throw Error('Archive inventory exceeded its bound');if((result.data?.length??0)<1000)break;
  }
 }
 console.log(JSON.stringify({phase:'archive export',objects:files.length}));
 const objects=[],writes=new Map();let total=0,index=0,failed=false;
 await Promise.all(Array.from({length:8},async()=>{
  try{while(index<files.length&&!failed){
   const path=files[index++];let bytes;
   for(const candidate of path.split('/').at(-1).match(/[a-f0-9]{64}/g)??[]){try{const saved=await readFile(join(directory,'objects',candidate));if(sha256(saved)===candidate){bytes=saved;break;}}catch{/* Download absent/unverified bytes. */}}
   if(!bytes){const result=await bucket.download(path);if(result.error||!result.data)throw Error('Archive download failed');if(result.data.size>52428800)throw Error('Archive object exceeded 50 MiB');bytes=Buffer.from(await result.data.arrayBuffer());}
   total+=bytes.length;if(total>2*1024**3)throw Error('Backup exceeded the 2 GiB safety bound');
   const hash=sha256(bytes),file=`objects/${hash}`,target=join(directory,file);
   // Multiple keys may share bytes; serialize a shared hash until its write finishes.
   if(!writes.has(hash))writes.set(hash,(async()=>{
    try{await writeFile(target,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;const existing=await readFile(target);if(sha256(existing)!==hash){if(!resume)throw Error('Existing archive file failed its hash check');await writeFile(target,bytes);}}
   })());
   await writes.get(hash);
   objects.push({path,file,sha256:hash,bytes:bytes.length});if(objects.length%250===0)console.log(JSON.stringify({phase:'archive progress',completed:objects.length,total:files.length}));
  }}catch(error){failed=true;throw error;}
 }));
 objects.sort((a,b)=>a.path.localeCompare(b.path));
 const sql={};for(const file of ['schema.sql','data.sql']){const bytes=await readFile(join(directory,file));sql[file]={sha256:sha256(bytes),bytes:bytes.length};}
 const migrations=query('select version from supabase_migrations.schema_migrations order by version').map(row=>row.version);
 const manifest={schemaVersion:1,project,createdAt:new Date().toISOString(),gitCommit:execFileSync('git',['rev-parse','HEAD']).toString().trim(),appliedMigrations:migrations,scope:'public application schema/data and regulatory-sources bytes; no Auth users, provider settings or credentials',authUsers:auth,files:sql,tableRows:copyCounts(await readFile(join(directory,'data.sql'),'utf8')),objects};
 await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});await verifyBackup(directory);
 console.log(JSON.stringify({status:'verified export',directory,tables:Object.keys(manifest.tableRows).length,objects:objects.length,archiveBytes:total}));
}catch(error){console.error(JSON.stringify({status:'failed',message:error instanceof Error&&!('stderr' in error)?error.message:'Backup command failed; private command output was suppressed. Incomplete directories are not verified backups.'}));process.exitCode=1;}
