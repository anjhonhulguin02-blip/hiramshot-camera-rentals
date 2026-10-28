import {assertSameOrigin,identity,json,failure,readBody} from '../../../../lib/api';
import {clientReviews,saveReview} from '../../../../lib/reviews';
export async function GET(){try{return json(await clientReviews(await identity()));}catch(error){return failure(error);}}
export async function POST(request:Request){try{assertSameOrigin(request);await saveReview(request,await identity(),await readBody(request));return json({ok:true});}catch(error){return failure(error);}}
