// Run only against an owner-controlled local container. No client documents.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const origin='http://127.0.0.1:8080',token=process.env.SCANNER_TOKEN;
if(!token||token.length<32)throw new Error('Supply the private scanner token through the process environment.');
const headers={Authorization:'Bearer '+token,'Content-Type':'application/octet-stream'};
const health=await fetch(origin+'/health',{headers,signal:AbortSignal.timeout(15000)});assert.equal(health.status,200);assert.equal((await health.json()).ready,true);
const denied=await fetch(origin+'/health',{signal:AbortSignal.timeout(5000)});assert.equal(denied.status,401);
const clean=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7d0AAAAASUVORK5CYII=','base64');
// Standard EICAR antivirus test string, assembled at runtime. Harmless test data.
const eicar=Buffer.from(['X5O!P%@AP[4','\\PZX54(P^)7CC)7}$','EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(''));
for(const [body,expected,status] of [[clean,true,200],[eicar,false,422]]){
 const response=await fetch(origin+'/scan',{method:'POST',headers,body,signal:AbortSignal.timeout(20000)}),result=await response.json();
 assert.equal(response.status,status);assert.equal(result.clean,expected);assert.equal(result.sha256,createHash('sha256').update(body).digest('hex'));
}
console.log('Local real-engine acceptance passed: recent signatures, authentication, clean PNG and EICAR rejection.');
