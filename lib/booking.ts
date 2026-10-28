import {validatePersonalDetails} from './personal-validation';
import {env} from '@hiramshot/runtime';
import {DOCUMENT_KINDS} from './verification';
export {DOCUMENT_KINDS} from './verification';
import { database, ApiError } from './api';
import { INITIAL_CATALOG, type Equipment } from './catalog';
import { decrypt } from './security';
import { financialState, type FinancialBooking, type FinancialState } from './ledger';
import { lifecycleStatus } from './finance';
export type BookingRow={ id:string;user_id:string;request_key:string;start_date:string;end_date:string;days:number;items:string;quote:string;status:string;contact:string;personal:string|null;verified_at:string|null;signed_at:string|null;contract_key:string|null;contract_hash:string|null;contract_content_hash:string|null;reservation_paid:number;paid_total:number;turnover:string|null;cleared_at:string|null;refunded_at:string|null;purge_at:string|null;purged_at:string|null;created_at:string;updated_at:string };
export async function catalog() {if(!env.DB)return INITIAL_CATALOG;const data=await database().prepare('SELECT config FROM equipment ORDER BY CASE id WHEN \'x5\' THEN 0 WHEN \'x6\' THEN 1 WHEN \'neo2\' THEN 2 ELSE 3 END,id').all<{config:string}>();return data.results.length?data.results.map(r=>JSON.parse(r.config) as Equipment):INITIAL_CATALOG;}
export async function getBooking(id:string,userId:string,admin=false){if(!/^[\da-f-]{36}$/i.test(id))throw new ApiError(404,'Booking not found.');const row=await database().prepare('SELECT * FROM bookings WHERE id=?').bind(id).first<BookingRow>();if(!row||(!admin&&row.user_id!==userId))throw new ApiError(404,'Booking not found.');return row;}
export async function safeBooking(row:BookingRow,admin=false,finance?:FinancialState){const booking=row as FinancialBooking;const quote=JSON.parse(row.quote);const pickup=booking.pickup_datetime||quote.agreementTerms?.pickupAt||row.start_date+'T09:00:00+08:00',returned=booking.return_datetime||quote.agreementTerms?.returnAt||row.end_date+'T09:00:00+08:00';return {...row,request_key:undefined,user_id:admin?row.user_id:undefined,contact:await decrypt(row.contact),personal:row.personal?await decrypt(row.personal):null,items:JSON.parse(row.items),quote,turnover:row.turnover?JSON.parse(row.turnover):null,contract_key:undefined,booking_reference_code:booking.booking_reference_code||'HSR-'+row.id.slice(0,8).toUpperCase(),pickup_datetime:pickup,return_datetime:returned,lifecycle_status:(row.status==='reserved'&&!row.verified_at?'PENDING_KYC_REVIEW':lifecycleStatus(row.status,returned)),finance:finance??await financialState(booking)};}

export function personalDetails(value:unknown){const result=validatePersonalDetails(value);if(Object.keys(result.errors).length)throw new ApiError(400,'Please correct the highlighted verification details.',result.errors);return result.details;}
