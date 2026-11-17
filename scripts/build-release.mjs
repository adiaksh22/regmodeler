import {spawnSync} from 'node:child_process';

// npm supplies its CLI path on Windows and Unix. Invoke Node directly to avoid shell quoting.
if(!process.env.npm_execpath)throw new Error('Run this command through npm run build:release.');
for(const command of ['build','release:assets:test']){
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'run',command],{
  stdio:'inherit',env:{...process.env,REGMODELER_RELEASE_BUILD:'1'},
 });
 if(result.error)throw new Error('Unable to start the release build verification.');
 if(result.status!==0)process.exit(result.status??1);
}
