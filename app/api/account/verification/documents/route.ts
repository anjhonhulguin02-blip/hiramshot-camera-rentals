import {ApiError,failure,identity,json} from '../../../../../lib/api';
import {ensureAccount} from '../../../../../lib/accounts';
import {currentAccountVerification} from '../../../../../lib/account-verification';
import {kycReady} from '../../../../../lib/security';
import {submitKycDocument} from '../../../../../lib/submit-kyc-document';
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');
 const user=await identity(),account=await ensureAccount(user),verification=await currentAccountVerification(account.id);
 if(!verification?.personal||verification.status!=='PENDING')throw new ApiError(409,'Save your verification details first, or ask HiramShot to replace an approved document.');
 if(!kycReady())throw new ApiError(503,'Private verification is not enabled.');
 return json(await submitKycDocument(request,user.userId,{type:'account',id:verification.id,version:verification.version}),201);
}catch(error){return failure(error);}}
