import { catalog } from '../../../lib/booking';
import { failure,json } from '../../../lib/api';
export async function GET(){try{return json({catalog:await catalog()});}catch(e){return failure(e);}}
