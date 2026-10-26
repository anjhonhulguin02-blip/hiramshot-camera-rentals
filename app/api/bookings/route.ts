import { assertSameOrigin, ApiError, database, failure, identity, json, readBody } from '../../../lib/api';
import { calculateQuote, type Selection } from '../../../lib/catalog';
import { catalog, safeBooking, type BookingRow } from '../../../lib/booking';
import { rentalPeriod } from '../../../lib/finance';
import { financialStates } from '../../../lib/ledger';
import { ensureAccount } from '../../../lib/accounts';
import { encrypt, abuseLimit, verifyTurnstile, audit, requireStaff } from '../../../lib/security';
export async function GET(request: Request) {
 try {
  const admin=new URL(request.url).searchParams.get('admin')==='1',user=admin?await requireStaff(request):await identity(),db=database();
  const rows=admin?await db.prepare('SELECT * FROM bookings WHERE is_demo=0 ORDER BY created_at DESC LIMIT 200').all<BookingRow>():await db.prepare('SELECT * FROM bookings WHERE user_id=? AND is_demo=0 ORDER BY created_at DESC LIMIT 100').bind(user.userId).all<BookingRow>();
  const states=await financialStates(rows.results);
  if(admin)await audit(request,user.userId,'','bookings.list');
  return json({bookings:await Promise.all(rows.results.map(row=>safeBooking(row,admin,states.get(row.id))))});
 }catch(error){return failure(error);}
}
export async function POST(request: Request) {
 try {
  assertSameOrigin(request);const user=await identity(),account=await ensureAccount(user),input=await readBody(request);
  const pickup=input?.pickupDatetime||String(input?.startDate)+'T09:00:00+08:00',returned=input?.returnDatetime||String(input?.endDate)+'T09:00:00+08:00';
  let period,quote;try{period=rentalPeriod(pickup,returned);quote=calculateQuote(await catalog(),input?.items as Selection[],period.days);}catch(error){throw new ApiError(400,(error as Error).message);}
  if(!/^[\da-f-]{36}$/i.test(input?.requestKey)||input.consent!==true)throw new ApiError(400,'A request key and acceptance of the privacy notice are required.');
  if(typeof input.name!=='string'||input.name.trim().length<2||input.name.length>100||typeof input.phone!=='string'||!/^[+\d() -]{7,25}$/.test(input.phone))throw new ApiError(400,'Enter your full name and valid mobile number.');
  if(typeof input.destinationOrEvent!=='string'||input.destinationOrEvent.trim().length<2||input.destinationOrEvent.length>300)throw new ApiError(400,'Enter the rental destination or event.');
  if(!['SELF_PICKUP_NORZAGARAY','MEETUP'].includes(input.turnoverMethod))throw new ApiError(400,'Select self-pickup in Norzagaray, Bulacan, or an agreed meetup.');
  const db=database(),old=await db.prepare('SELECT id FROM bookings WHERE user_id=? AND request_key=?').bind(user.userId,input.requestKey).first();if(old)return json({id:old.id});
  await abuseLimit(request,user.userId,'booking');await verifyTurnstile(request,input.turnstileToken,'booking');
  const id=crypto.randomUUID(),now=new Date().toISOString(),reference='HSR-'+new Date().getUTCFullYear()+'-'+id.replaceAll('-','').slice(0,12).toUpperCase();
  await audit(request,user.userId,id,'booking.create.attempt');
  await db.prepare('INSERT INTO bookings(id,user_id,request_key,start_date,end_date,days,items,quote,status,contact,created_at,updated_at,client_id,booking_reference_code,pickup_datetime,return_datetime,destination_or_event,turnover_method,total_rental_fee_centavos,security_deposit_centavos,required_reservation_centavos) VALUES (?,?,?,?,?,?,?,?,\'requested\',?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,request_key) DO NOTHING')
   .bind(id,user.userId,input.requestKey,pickup.slice(0,10),returned.slice(0,10),period.days,JSON.stringify(input.items),JSON.stringify(quote),await encrypt({name:input.name.trim(),phone:input.phone,email:user.email}),now,now,account.id,reference,pickup,returned,input.destinationOrEvent.trim(),input.turnoverMethod,(quote.totalMax??0)*100,quote.depositMax*100,(quote.reservationMax??0)*100).run();
  const saved=await db.prepare('SELECT id FROM bookings WHERE user_id=? AND request_key=?').bind(user.userId,input.requestKey).first();
  return json({id:saved!.id},201);
 }catch(error){return failure(error);}
}
