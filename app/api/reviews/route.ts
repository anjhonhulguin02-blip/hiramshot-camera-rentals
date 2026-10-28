import {json,failure} from '../../../lib/api';
import {publicReviews} from '../../../lib/reviews';
export async function GET(){try{return json(await publicReviews());}catch(error){return failure(error);}}
