import assert from 'node:assert/strict';
import {loadConfigFromFile} from 'vite';

const names=['REGMODELER_RELEASE_BUILD',...Object.keys(process.env).filter(name=>name.startsWith('VITE_')),'VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'];
const original=new Map(names.map(name=>[name,process.env[name]]));
const config=()=>loadConfigFromFile({command:'build',mode:'production'},undefined,undefined,'silent');
try{
 for(const name of names)delete process.env[name];
 process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='';
 process.env.REGMODELER_RELEASE_BUILD='1';
 await assert.rejects(config,/Release builds require/);
 process.env.VITE_SUPABASE_URL='http://127.0.0.1:54321';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';
 await assert.rejects(config,/Release builds require/);
 process.env.VITE_SUPABASE_URL='https://localhost';
 await assert.rejects(config,/Release builds require/);
 process.env.VITE_SUPABASE_URL='https://example.supabase.co';
 assert.ok(await config());
 process.env.VITE_SUPABASE_PUBLISHABLE_KEY='sb_secret_fixture';
 await assert.rejects(config,/not allowed/);
 process.env.VITE_SUPABASE_URL='';process.env.VITE_SUPABASE_PUBLISHABLE_KEY='';
 delete process.env.REGMODELER_RELEASE_BUILD;
 assert.ok(await config(),'Regular CI builds still support demo configuration');
 console.log('Release configuration checks passed: demo/local rejection, hosted public configuration, server-key rejection and regular CI demo support.');
}finally{
 for(const name of names){const value=original.get(name);if(value===undefined)delete process.env[name];else process.env[name]=value;}
}
