import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
const OPTIONS={N:32768,r:8,p:3,maxmem:64*1024*1024};
const COMMON=new Set(['password12','password123','1234567890','qwertyuiop','hiramshot12','passwordpassword','password12345678','123456789012345','hiramshot123456','qwertyuiop123456']);
export function normalizeLoginEmail(value:unknown){
 if(typeof value!=='string')throw new Error('Enter a valid email address.');
 const email=value.trim().toLowerCase();
 if(email.length>254||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))throw new Error('Enter a valid email address.');
 return email;
}
export function validatePassword(value:unknown){
 if(typeof value!=='string'||[...value].length<10||[...value].length>128||new TextEncoder().encode(value).length>512||/[\u0000-\u001f\u007f]/.test(value))throw new Error('Use 10–128 characters. Spaces and passphrases are welcome.');
 if(COMMON.has(value.toLowerCase())||/^(.)\1+$/.test(value))throw new Error('Choose a less predictable password.');
 return value;
}
function derive(password:string,salt:Buffer){return new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,OPTIONS,(error,key)=>error?reject(error):resolve(key)));}
export async function hashPassword(value:unknown){const password=validatePassword(value),salt=randomBytes(16),key=await derive(password,salt);return `scrypt$32768$8$3$${salt.toString('hex')}$${key.toString('hex')}`;}
export async function verifyPassword(value:unknown,stored:string){
 if(typeof value!=='string'||new TextEncoder().encode(value).length>512)return false;
 const match=/^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored);if(!match)return false;
 return timingSafeEqual(await derive(value,Buffer.from(match[1],'hex')),Buffer.from(match[2],'hex'));
}
export function newPasswordToken(){return randomBytes(32).toString('base64url');}
export function passwordTokenHash(value:unknown){if(typeof value!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value))throw new Error('This link is invalid or expired. Request a new email.');return createHash('sha256').update(value).digest('hex');}
