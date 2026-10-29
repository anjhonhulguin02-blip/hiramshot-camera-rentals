import {json,failure} from '../../../../../lib/api';
import {bookingPaymentQr} from '../../../../../lib/booking-payment-qr';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params,{booking,settings,amount}=await bookingPaymentQr(id);
 return json({method:'GCASH_QR_PH',amountCentavos:amount,reference:(booking as typeof booking&{booking_reference_code?:string}).booking_reference_code||booking.id,recipientLabel:settings.recipientLabel,qrUrl:'/api/bookings/'+encodeURIComponent(id)+'/payment-qr',confirmation:'ADMIN_VERIFICATION_REQUIRED'});
 }catch(error){return failure(error);}}
