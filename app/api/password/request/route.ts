import {assertSameOrigin,readBody,json,failure} from '../../../../lib/api';
import {requestPasswordEmail} from '../../../../lib/password-auth';
export async function POST(request:Request){try{assertSameOrigin(request);await requestPasswordEmail(request,await readBody(request));return json({ok:true,message:'If this email is eligible, a secure link will arrive shortly. Check your inbox and spam folder.'});}catch(error){return failure(error);}}
