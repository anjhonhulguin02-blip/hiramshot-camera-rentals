import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
export class PrivateR2Bucket {
 private readonly client:S3Client;private readonly bucket:string;
 constructor(config:{accountId:string;bucket:string;accessKeyId:string;secretAccessKey:string},client?:S3Client){
  if(!/^[a-f0-9]{32}$/.test(config.accountId)||!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(config.bucket))throw new Error('Invalid private R2 configuration.');
  this.bucket=config.bucket;this.client=client??new S3Client({region:'auto',endpoint:`https://${config.accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},maxAttempts:1});
 }
 private key(value:string){if(!/^(?:kyc|receipts|contracts)\/[a-f0-9-]+(?:\.pdf)?$/.test(value))throw new Error('Invalid private object key.');return value;}
 async put(key:string,bytes:Uint8Array,options?:{httpMetadata?:{contentType?:string};customMetadata?:Record<string,string>}){await this.client.send(new PutObjectCommand({Bucket:this.bucket,Key:this.key(key),Body:bytes,ContentType:options?.httpMetadata?.contentType??'application/octet-stream',Metadata:options?.customMetadata,CacheControl:'private, no-store'}));}
 async get(key:string){try{const object=await this.client.send(new GetObjectCommand({Bucket:this.bucket,Key:this.key(key)}));return object.Body?{body:object.Body.transformToWebStream()}:null;}catch(error){if((error as {name?:string}).name==='NoSuchKey'||(error as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode===404)return null;throw error;}}
 async delete(key:string){await this.client.send(new DeleteObjectCommand({Bucket:this.bucket,Key:this.key(key)}));}
}
