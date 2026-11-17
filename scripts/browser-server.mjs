import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preview} from 'vite';

const root=fileURLToPath(new URL('../',import.meta.url));
const outDir='.artifacts/browser-dist';
// Explicit synthetic public values override local Vite configuration for this isolated bundle.
const built=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url)),'build','--mode','browser-test','--outDir',outDir],{
 cwd:root,stdio:'inherit',env:{...process.env,VITE_SUPABASE_URL:'https://browser-fixture.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_browser_fixture_only'},
});
if(built.error||built.status!==0)process.exit(built.status||1);
await preview({root,configFile:false,build:{outDir},preview:{host:'127.0.0.1',port:4183,strictPort:true}});
