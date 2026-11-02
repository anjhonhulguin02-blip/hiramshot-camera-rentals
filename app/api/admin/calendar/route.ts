import {ApiError,database,failure,json} from '../../../../lib/api';
import {calendarMonth} from '../../../../lib/availability';
import {catalog} from '../../../../lib/booking';
import {audit,decrypt,requireStaff} from '../../../../lib/security';
export async function GET(request:Request){try{
 const user=await requireStaff(request),month=calendarMonth(new URL(request.url).searchParams.get('month')),db=database();
 const rows=await db.prepare("SELECT id,booking_reference_code,contact,items,status,pickup_datetime,return_datetime,start_date,end_date FROM bookings WHERE is_demo=0 AND archived_at IS NULL AND status IN ('requested','verification','verified','reserved','signed','out') AND (status='out' OR (start_date<=? AND end_date>=?)) ORDER BY start_date,id LIMIT 1001").bind(month.end,month.start).all<{id:string;booking_reference_code:string;contact:string;items:string;status:string;pickup_datetime:string;return_datetime:string;start_date:string;end_date:string}>();
 if(rows.results.length>1000)throw new ApiError(409,'There are too many requests for this month. Review the booking queue first.');
 const holds=await db.prepare('SELECT r.booking_id,r.unit_id,r.pickup_ms,r.return_ms,u.equipment_id FROM unit_reservations r JOIN units u ON u.id=r.unit_id WHERE r.pickup_ms<? AND r.return_ms>?').bind(month.last,month.first).all();
 const bookings=await Promise.all(rows.results.map(async row=>{const returned=row.return_datetime||row.end_date+'T09:00:00+08:00',overdue=row.status==='out'&&Date.parse(returned)<Date.now();return {id:row.id,reference:row.booking_reference_code||'HSR-'+row.id.slice(0,8).toUpperCase(),name:(await decrypt(row.contact)).name,items:JSON.parse(row.items) as {equipmentId:string;variant:string}[],status:row.status,pickup:row.pickup_datetime||row.start_date+'T09:00:00+08:00',return:returned,overdue,blockedUntil:overdue?new Date(month.last).toISOString():undefined};}));
 await audit(request,user.userId,'','calendar.view');
 return json({month:month.month,timezone:'Asia/Manila',gear:(await catalog()).map(g=>({id:g.id,name:g.name})),holds:holds.results,bookings});
}catch(error){return failure(error);}}
