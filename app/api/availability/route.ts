import {ApiError,failure,json} from '../../../lib/api';
import {publicAvailability,unavailableEquipment} from '../../../lib/availability';
import {rentalPeriod} from '../../../lib/finance';
import {catalog} from '../../../lib/booking';
export async function GET(request:Request){try{
 const query=new URL(request.url).searchParams;
 // Preserve the earlier single-gear exact-period availability API.
 if(query.has('gear')&&!query.has('equipment')){
  const id=query.get('gear')||'';if(!(await catalog()).some(g=>g.id===id&&g.active))throw new ApiError(400,'Choose valid equipment.');
  let period;try{period=rentalPeriod(query.get('pickup')||query.get('start')+'T09:00:00+08:00',query.get('return')||query.get('end')+'T09:00:00+08:00');}catch(error){throw new ApiError(400,(error as Error).message);}
  return json({available:!(await unavailableEquipment([id],period.pickupMs,period.returnMs)).length,message:'Availability is finalized atomically after payment is recorded and the reservation is confirmed.'});
 }
 const ids=[...new Set((query.get('equipment')||'').split(',').filter(Boolean))];
 if(ids.some(id=>!/^[-a-z0-9]{1,60}$/.test(id)))throw new ApiError(400,'Choose valid equipment.');
 const data=await publicAvailability(query.get('month'),ids);let selected:undefined|{available:boolean;unavailable:string[]};
 if(query.has('pickup')||query.has('return')){
  let period;try{period=rentalPeriod(query.get('pickup')||'',query.get('return')||'');}catch(error){throw new ApiError(400,(error as Error).message);}
  const unavailable=await unavailableEquipment(ids,period.pickupMs,period.returnMs);selected={available:!unavailable.length,unavailable};
 }
 return json({...data,selected});
}catch(error){return failure(error);}}
