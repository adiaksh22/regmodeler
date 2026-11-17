// Restores only into a new, network-isolated disposable container, never a hosted database.
import {spawnSync,execFileSync} from 'node:child_process';
import {readFile,writeFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {verifyBackup} from './backup-artifacts.mjs';
const image='public.ecr.aws/supabase/postgres:17.11.0.003';
const name=`regmodeler-recovery-${randomUUID()}`;let started=false,phase='verify files',diagnostics='',directory;
const docker=(args,input)=>{
 const result=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:16*1024*1024,timeout:120000});
 if(result.error||result.status!==0){diagnostics=result.stderr||result.error?.message||'Unknown command failure';throw Error('Isolated recovery command failed; private SQL output was suppressed.');}return result.stdout;
};
const sql=statement=>docker(['exec','-i',name,'psql','-X','-qAt','-U','supabase_admin','-d','regmodeler_recovery','--set','ON_ERROR_STOP=1'],statement);
try{
 if(!process.argv[2])throw Error('Pass a verified backup directory under .artifacts/backups');
 const root=await realpath(resolve('.artifacts/backups'));directory=await realpath(resolve(process.argv[2]));const child=relative(root,directory);
 if(!child||child.startsWith('..')||isAbsolute(child))throw Error('Recovery input must stay inside .artifacts/backups');
 const manifest=await verifyBackup(directory);
 phase='start isolated database';docker(['run','--detach','--name',name,'--network','none','--env','POSTGRES_HOST_AUTH_METHOD=trust',image]);started=true;
 let ready=false;
 for(let attempt=0;attempt<60;attempt++){
  const health=spawnSync('docker',['inspect','--format','{{.State.Health.Status}}',name],{encoding:'utf8',timeout:3000}).stdout?.trim();
  if(health==='healthy'&&spawnSync('docker',['exec',name,'pg_isready','-U','supabase_admin','-d','postgres'],{stdio:'ignore',timeout:3000}).status===0){ready=true;break;}
  await new Promise(done=>setTimeout(done,500));
 }
 if(!ready)throw Error('Isolated recovery database did not start');
 docker(['exec',name,'createdb','-U','supabase_admin','--template','template0','regmodeler_recovery']);
 sql(`do $$begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
 end$$;
 create schema if not exists auth;create table if not exists auth.users(id uuid primary key);
 create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema if not exists extensions;create extension if not exists pgcrypto with schema extensions;
 grant usage on schema auth to anon,authenticated,service_role;
 `);
 phase='restore schema';sql(await readFile(join(directory,'schema.sql'),'utf8'));
 phase='restore data';
 sql(`set session_replication_role=replica;\n${await readFile(join(directory,'data.sql'),'utf8')}\nset session_replication_role=origin;`);
 phase='verify rows and constraints';const counts={};
 for(const [table,expected] of Object.entries(manifest.tableRows)){
  if(!/^[a-z_][a-z0-9_]*$/.test(table))throw Error('Invalid restored table identity');
  const actual=Number(sql(`select count(*) from public."${table}";`).trim());if(actual!==expected)throw Error('Restored row count mismatch');counts[table]=actual;
 }
 // Replica mode permits cyclic pointers during COPY. Explicitly inspect every
 // public foreign key afterwards; an already-valid constraint is not rechecked by VALIDATE.
 sql(`do $$declare f record;bad bigint;condition text;nonnull text;begin
 for f in select c.oid,c.conrelid::regclass as child,c.confrelid::regclass as parent,c.conkey,c.confkey from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and c.contype='f' loop
  select string_agg(format('c.%I=p.%I',a.attname,b.attname),' and ' order by k.ordinality),string_agg(format('c.%I is not null',a.attname),' and ' order by k.ordinality) into condition,nonnull
  from unnest(f.conkey,f.confkey) with ordinality k(childatt,parentatt,ordinality) join pg_attribute a on a.attrelid=f.child and a.attnum=k.childatt join pg_attribute b on b.attrelid=f.parent and b.attnum=k.parentatt;
  execute format('select count(*) from %s c where %s and not exists(select 1 from %s p where %s)',f.child,nonnull,f.parent,condition) into bad;
  if bad>0 then raise exception 'Restored foreign key mismatch';end if;
 end loop;end$$;`);
 const references=JSON.parse(sql("select coalesce(jsonb_agg(r),'[]') from (select storage_path as path,content_sha256 as sha from public.document_versions where storage_path is not null union all select storage_path,content_sha256 from public.source_attachments where storage_path is not null) r;").trim());
 const byPath=new Map(manifest.objects.map(object=>[object.path,object]));
 for(const reference of references){const object=byPath.get(reference.path);if(!object||reference.sha&&reference.sha!==object.sha256)throw Error('Restored original is missing or has different bytes');}
 const graphSql="select coalesce(jsonb_agg(r),'[]') from (select tcds_number,count(*) as paths,count(distinct model) as models from public.model_graph group by tcds_number order by tcds_number) r;";
 const graph=JSON.parse(sql(graphSql).trim());
 const publicGraph=JSON.parse(sql(`begin;set local role anon;${graphSql}rollback;`).trim());if(JSON.stringify(publicGraph)!==JSON.stringify(graph))throw Error('Restored public graph visibility differs');
 const report={status:'passed application recovery drill',checkedAt:new Date().toISOString(),project:manifest.project,image,tables:Object.keys(counts).length,rows:Object.values(counts).reduce((a,b)=>a+b,0),objects:manifest.objects.length,referencedOriginals:references.length,graph,publicGraphVerified:true,scope:'Restored public schema/data and verified archived bytes locally. Auth/Storage service infrastructure, provider settings and off-site recovery are not simulated.'};
 const reportText=JSON.stringify(report,null,2);await writeFile(join(directory,`restore-report-${report.checkedAt.replaceAll(':','-')}.json`),reportText,{flag:'wx'});await writeFile(join(directory,'restore-report.json'),reportText);console.log(JSON.stringify(report));
}catch(error){if(directory&&diagnostics)await writeFile(join(directory,'restore-error.log'),diagnostics);console.error(JSON.stringify({status:'failed',phase,message:error.message}));process.exitCode=1;}
finally{if(started){try{execFileSync('docker',['rm','--force','--volumes',name],{stdio:'ignore',timeout:30000});}catch{console.error('Disposable recovery container cleanup failed; inspect Docker before another drill.');process.exitCode=1;}}}
