import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {D1HttpDatabase} from '../lib/runtime/d1-http.ts';
const config=JSON.parse(readFileSync(new URL('../cloudflare/wrangler.app.jsonc',import.meta.url),'utf8'));
let credential;try{credential=JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{throw new Error('Cloudflare login is required. No credential was printed or saved.');}
const token=credential.token??credential.oauth_token;if(typeof token!=='string')throw new Error('Unsupported Cloudflare credential format.');
const db=new D1HttpDatabase({accountId:config.account_id,databaseId:config.d1_databases[0].database_id,token}),now=new Date().toISOString();
if(!process.env.ADMIN_ACCESS_EMAILS)throw new Error('Provide the private ADMIN_ACCESS_EMAILS environment value. Never commit it.');
const administrators=process.env.ADMIN_ACCESS_EMAILS.split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
for(const email of administrators){
 if(!/^\S+@\S+\.\S+$/.test(email))throw new Error('Invalid configured administrator email.');
 await db.prepare("INSERT INTO users(id,role,full_name,email,created_at,updated_at) VALUES (?,'ADMIN',?,?,?,?) ON CONFLICT(email) DO NOTHING").bind(crypto.randomUUID(),'HiramShot owner',email,now,now).run();
 await db.prepare("UPDATE users SET role='ADMIN',updated_at=? WHERE email=? AND account_status='ACTIVE' AND role<>'ADMIN'").bind(now,email).run();
}
await db.prepare(`UPDATE users SET role='CLIENT',updated_at=? WHERE role IN ('ADMIN','STAFF') AND email NOT IN (${administrators.map(()=>'?').join(',')})`).bind(now,...administrators).run();
console.log('Administrator bootstrap profiles are ready. They contain no password; only verified Google identities can claim an unlinked profile.');
