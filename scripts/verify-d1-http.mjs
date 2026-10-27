import {execFileSync} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {D1HttpDatabase} from '../lib/runtime/d1-http.ts';
import {CONSUME_LIMIT_SQL,requestLimitBindings,UNVERIFIED_BOOKING_LIMIT} from '../lib/request-limits.ts';
const config=JSON.parse(readFileSync(new URL('../cloudflare/wrangler.retention.jsonc',import.meta.url),'utf8'));
let token=process.env.CLOUDFLARE_D1_API_TOKEN;
if(!token){
 let credential;try{credential=JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{throw new Error('Cloudflare CLI login could not be read. No credential was printed or saved.');}
 token=credential.token??credential.oauth_token;if(typeof token!=='string')throw new Error('Unsupported Cloudflare credential format.');
}
const databaseId=config.d1_databases[0].database_id,db=new D1HttpDatabase({accountId:config.account_id,databaseId,token});
const suffix=crypto.randomUUID().replaceAll('-',''),table='deployment_probe_'+suffix,prefix='deployment-probe:'+suffix+':';
try{
 await db.prepare(`CREATE TABLE ${table}(id TEXT PRIMARY KEY)`).run();
 let rejected=false;try{await db.batch([db.prepare(`INSERT INTO ${table}(id) VALUES (?)`).bind('duplicate'),db.prepare(`INSERT INTO ${table}(id) VALUES (?)`).bind('duplicate')]);}catch(error){if(!/UNIQUE/.test(error.message))throw error;rejected=true;}
 const row=await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
 if(!rejected||row.count!==0)throw new Error('D1 HTTP atomic rollback failed. Do not enable the Vercel database binding.');
 const now=Math.floor(Date.now()/1000);for(let i=0;i<4;i++){
  const result=await db.prepare(CONSUME_LIMIT_SQL).bind(...requestLimitBindings(prefix+'user:',prefix+'ip:',UNVERIFIED_BOOKING_LIMIT,now,String(i))).run();
  if(result.meta.changes!==(i<3?2:0))throw new Error('Real D1 request-limit admission failed.');
 }
 writeFileSync(new URL('../outputs/d1-http-verification.json',import.meta.url),JSON.stringify({databaseId,atomicRollback:true,rollingQuota:true,verifiedAt:new Date().toISOString()},null,2));
 console.log('PASS: remote D1 HTTP batch fully rolls back on failure; account/IP rolling quota admits only three bookings. Credentials were not persisted.');
}finally{
 await db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
 await db.prepare('DELETE FROM request_limits WHERE key>=? AND key<?').bind(prefix,prefix+'\uffff').run();
}
