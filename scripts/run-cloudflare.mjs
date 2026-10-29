import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
const [command,...args]=process.argv.slice(2);
if(!['build','dev'].includes(command))throw new Error('Expected build or dev.');
const vite=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url));
const environment=new URL('./sites-env.mjs',import.meta.url).href;
const child=spawn(process.execPath,['--import',environment,vite,...(command==='build'?['build']:['--host','127.0.0.1','--port','5173']),'--config','vite.cloudflare.config.ts',...args],{stdio:'inherit'});
child.on('exit',code=>{if(code===0&&command==='build'){const target=fileURLToPath(new URL('../dist/server/wrangler.json',import.meta.url)),config=JSON.parse(readFileSync(target,'utf8'));if(config.name!=='hiramshot-camera-rentals')throw new Error('Unexpected build target');delete config.legacy_env;writeFileSync(target,JSON.stringify(config));}process.exit(code??1);});child.on('error',()=>{console.error('Cloudflare build could not start.');process.exit(1);});
