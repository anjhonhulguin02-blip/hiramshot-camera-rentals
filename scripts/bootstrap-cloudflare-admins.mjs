import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {D1HttpDatabase} from '../lib/runtime/d1-http.ts';
const config=JSON.parse(readFileSync(new URL('../cloudflare/wrangler.app.jsonc',import.meta.url),'utf8'));
let credential;try{credential=JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{throw new Error('Cloudflare login is required. No credential was printed or saved.');}
const token=credential.token??credential.oauth_token;if(typeof token!=='string')throw new Error('Unsupported Cloudflare credential format.');
const db=new D1HttpDatabase({accountId:config.account_id,databaseId:config.d1_databases[0].database_id,token}),now=new Date().toISOString();
for(const email of config.vars.ADMIN_EMAILS.split(',').map(value=>value.trim().toLowerCase())){
 if(!/^\S+@\S+\.\S+$/.test(email))throw new Error('Invalid configured administrator email.');
 await db.prepare("INSERT INTO users(id,role,full_name,email,created_at,updated_at) VALUES (?,'ADMIN',?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(crypto.randomUUID(),'HiramShot owner',email,now,now).run();
}
console.log('Administrator bootstrap profiles are ready. They contain no password; only verified Google identities can claim an unlinked profile.');
