import {ApiError,failure,identity,json} from '../../../../../lib/api';
import {getBooking} from '../../../../../lib/booking';
import {kycReady} from '../../../../../lib/security';
import {submitKycDocument} from '../../../../../lib/submit-kyc-document';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');
 const user=await identity(),{id}=await params,row=await getBooking(id,user.userId);
 if(!['requested','verification','reserved'].includes(row.status)||(row.status==='reserved'&&row.verified_at)||!row.personal)throw new ApiError(409,'Save your verification details before submitting photos.');
 if(!kycReady())throw new ApiError(503,'Private verification is not enabled.');
 return json(await submitKycDocument(request,user.userId,{type:'booking',id}),201);
}catch(error){return failure(error);}}
