import {ApiError,database,failure,json} from '../../../../../../lib/api';
import {ensureAccount} from '../../../../../../lib/accounts';
import {requireAccountVerification} from '../../../../../../lib/account-verification';
import {requireAdmin,kycReady} from '../../../../../../lib/security';
import {submitKycDocument} from '../../../../../../lib/submit-kyc-document';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');const user=await requireAdmin(request),operator=await ensureAccount(user),row=await requireAccountVerification((await params).id);
 if(row.status!=='PENDING'||!row.personal)throw new ApiError(409,'The client must save verification details before you add their requirements.');
 const client=await database().prepare("SELECT auth_user_id FROM users WHERE id=? AND account_status='ACTIVE'").bind(row.user_id).first<{auth_user_id:string}>();
 if(!client?.auth_user_id)throw new ApiError(409,'The client account must be active.');
 if(!kycReady())throw new ApiError(503,'Private file safety checks are not ready.');
 return json(await submitKycDocument(request,user.userId,{type:'account',id:row.id,version:row.version},{clientPrincipal:client.auth_user_id,internalAdminId:operator.id}),201);
}catch(error){return failure(error);}}
