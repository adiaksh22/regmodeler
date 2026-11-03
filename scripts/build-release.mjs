import {spawnSync} from 'node:child_process';

// npm supplies its CLI path on Windows and Unix. Invoke Node directly to avoid shell quoting.
if(!process.env.npm_execpath)throw new Error('Run this command through npm run build:release.');
const result=spawnSync(process.execPath,[process.env.npm_execpath,'run','build'],{
 stdio:'inherit',env:{...process.env,REGMODELER_RELEASE_BUILD:'1'},
});
if(result.error)throw new Error('Unable to start the release build.');
process.exitCode=result.status??1;
