import {assertSameOrigin,readBody,json,failure} from '../../../../lib/api';
import {completePassword} from '../../../../lib/password-auth';
export async function POST(request:Request){try{assertSameOrigin(request);await completePassword(request,await readBody(request));return json({ok:true});}catch(error){return failure(error);}}
