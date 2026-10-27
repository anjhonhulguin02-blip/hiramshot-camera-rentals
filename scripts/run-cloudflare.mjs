import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const [command,...args]=process.argv.slice(2);
if(!['build','dev'].includes(command))throw new Error('Expected build or dev.');
const vite=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url));
const environment=new URL('./sites-env.mjs',import.meta.url).href;
const child=spawn(process.execPath,['--import',environment,vite,...(command==='build'?['build']:['--host','127.0.0.1','--port','5173']),'--config','vite.cloudflare.config.ts',...args],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));child.on('error',()=>{console.error('Cloudflare build could not start.');process.exit(1);});
