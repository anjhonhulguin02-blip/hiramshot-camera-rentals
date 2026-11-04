import {ApiError,failure,json} from '../../../../../../lib/api';
import {getBooking} from '../../../../../../lib/booking';
import {ensureAccount} from '../../../../../../lib/accounts';
import {requireAdmin,kycReady} from '../../../../../../lib/security';
import {submitKycDocument} from '../../../../../../lib/submit-kyc-document';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');const user=await requireAdmin(request),operator=await ensureAccount(user),row=await getBooking((await params).id,user.userId,true);
 if(row.archived_at||!['requested','verification'].includes(row.status)||row.verified_at)throw new ApiError(409,'Files can be added to a pending, unapproved rental request.');
 if(!kycReady())throw new ApiError(503,'Private file safety checks are not ready.');
 return json(await submitKycDocument(request,user.userId,{type:'booking',id:row.id},{clientPrincipal:row.user_id,internalAdminId:operator.id}),201);
}catch(error){return failure(error);}}
