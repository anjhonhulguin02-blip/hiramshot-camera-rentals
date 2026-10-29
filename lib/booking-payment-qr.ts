import {env} from '@hiramshot/runtime';
import {ApiError,identity} from './api';
import {getBooking} from './booking';
import {financialState,type FinancialBooking} from './ledger';
import {paymentQrSettings,reservationQrAmount} from './payment-qr';
export async function bookingPaymentQr(id:string){
 const user=await identity(),booking=await getBooking(id,user.userId),finance=await financialState(booking);
 let amount:number;try{amount=reservationQrAmount(booking as FinancialBooking,finance);}catch(error){throw new ApiError(409,(error as Error).message);}
 const settings=paymentQrSettings(env.PAYMENT_QR_SETTINGS);if(!settings||!env.BUCKET)throw new ApiError(503,'Payment instructions could not load. Contact HiramShot before sending money.');
 return {user,booking,settings,amount};
}
