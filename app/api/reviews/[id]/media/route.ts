import {identity,json,failure} from '../../../../../lib/api';
import {uploadReviewMedia} from '../../../../../lib/reviews';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{await uploadReviewMedia(request,await identity(),(await params).id);return json({ok:true});}catch(error){return failure(error);}}
