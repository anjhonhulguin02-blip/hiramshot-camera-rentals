import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const base=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','secret'];
const config=['--config','cloudflare/wrangler.app.jsonc'];
let names;try{names=new Set(JSON.parse(execFileSync(process.execPath,[...base,'list',...config],{encoding:'utf8',stdio:['ignore','pipe','pipe']})).map(item=>item.name));}catch{throw new Error('The Worker must be deployed before secret initialization. No secret was printed.');}
const values={};
for(const key of ['AUTH_SECRET','DATA_ENCRYPTION_KEY','ADMIN_SESSION_SECRET','AUDIT_HMAC_KEY','DOWNLOAD_SECRET','PURGE_SECRET'])if(!names.has(key))values[key]=randomBytes(32).toString(key==='DATA_ENCRYPTION_KEY'?'base64':'hex');
if(Object.keys(values).length){try{execFileSync(process.execPath,[...base,'bulk',...config],{input:JSON.stringify(values),encoding:'utf8',stdio:['pipe','pipe','pipe']});}catch{throw new Error('Secret initialization was not confirmed. Inspect key names before retrying; do not rotate existing keys.');}}
console.log(JSON.stringify({createdKeys:Object.keys(values),existingKeysPreserved:true,valuesPrinted:false}));
