import {failure,json,ApiError} from '../../../lib/api';
import {catalog} from '../../../lib/booking';
import {rentalPeriod} from '../../../lib/finance';
import {findAvailableUnit} from '../../../lib/inventory';
export async function GET(request:Request){try{
 const params=new URL(request.url).searchParams,gear=params.get('gear'),item=(await catalog()).find(g=>g.id===gear&&g.active);
 if(!item)throw new ApiError(400,'Choose valid equipment.');
 let period;try{period=rentalPeriod(params.get('pickup')||params.get('start')+'T09:00:00+08:00',params.get('return')||params.get('end')+'T09:00:00+08:00');}catch(error){throw new ApiError(400,(error as Error).message);}
 const start=new Date(period.pickupMs+8*3600000).toISOString().slice(0,10),end=new Date(period.returnMs+8*3600000).toISOString().slice(0,10);
 return json({available:!!await findAvailableUnit(item.id,period.pickupMs,period.returnMs,start,end),message:'Availability is finalized atomically after payment is recorded and the reservation is confirmed.'});
}catch(error){return failure(error);}}
