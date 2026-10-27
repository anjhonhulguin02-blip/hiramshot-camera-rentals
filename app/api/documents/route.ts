import {POST as uploadBookingDocument} from '../bookings/[id]/documents/route';
import {json} from '../../../lib/api';
export async function POST(request:Request){
 const bookingId=new URL(request.url).searchParams.get('bookingId');
 if(!bookingId||!/^[\da-f-]{36}$/i.test(bookingId))return json({error:'Provide a valid bookingId query parameter.'},400);
 return uploadBookingDocument(request,{params:Promise.resolve({id:bookingId})});
}
