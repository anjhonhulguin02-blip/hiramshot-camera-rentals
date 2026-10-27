import 'server-only';
import {D1HttpDatabase} from './d1-http';
import {PrivateR2Bucket} from './r2-s3';
export const platform:string='vercel';
export const isDevelopment=process.env.NODE_ENV==='development';
export const uploadMaxBytes=4*1024*1024;
const keys=['ADMIN_USER_IDS','ADMIN_EMAIL','CONTACT_EMAIL','ADMIN_TOTP_SECRET','ADMIN_SESSION_SECRET','DATA_ENCRYPTION_KEY','AUDIT_HMAC_KEY','DOWNLOAD_SECRET','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','KYC_ENABLED','MALWARE_SCANNER_URL','MALWARE_SCANNER_TOKEN','PURGE_SECRET','KYC_RETENTION_DAYS','ADMIN_CONTACT_EMAIL','ADMIN_EMAILS','APP_BASE_URL','NEXT_PUBLIC_SITE_URL','CUSTOM_DOMAIN','PUBLIC_INDEXING_ENABLED'] as const;
export const env:Cloudflare.Env=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
if(!env.APP_BASE_URL){const host=process.env.VERCEL_URL;if(host&&/^[a-z0-9.-]+\.vercel\.app$/.test(host))env.APP_BASE_URL=`https://${host}`;}
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID,databaseId=process.env.CLOUDFLARE_D1_DATABASE_ID,token=process.env.CLOUDFLARE_D1_API_TOKEN;
// Real rollback verification is required before enabling this database binding.
if(accountId&&databaseId&&token&&process.env.D1_ATOMIC_BATCH_VERIFIED==='true')env.DB=new D1HttpDatabase({accountId,databaseId,token}) as unknown as D1Database;
const bucket=process.env.R2_BUCKET_NAME,accessKeyId=process.env.R2_ACCESS_KEY_ID,secretAccessKey=process.env.R2_SECRET_ACCESS_KEY;
if(accountId&&bucket&&accessKeyId&&secretAccessKey)env.BUCKET=new PrivateR2Bucket({accountId,bucket,accessKeyId,secretAccessKey}) as unknown as R2Bucket;
