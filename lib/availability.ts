import {ApiError,database} from './api';
import {catalog} from './booking';
import {findAvailableUnit} from './inventory';
import {isDate,todayManila} from './rental';
const DAY=86400000,OFFSET=8*3600000;
export function calendarMonth(value:string|null,now=Date.now()){
 const month=value||todayManila(new Date(now)).slice(0,7);
 if(!/^\d{4}-\d{2}$/.test(month)||!isDate(month+'-01'))throw new ApiError(400,'Choose a valid calendar month.');
 const first=Date.parse(month+'-01T00:00:00+08:00'),date=new Date(first+OFFSET),last=Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)-OFFSET;
 if(Math.abs(first-now)>550*DAY)throw new ApiError(400,'Choose a calendar month within the next or previous 18 months.');
 return {month,first,last,start:month+'-01',end:new Date(last+OFFSET).toISOString().slice(0,10),days:Math.round((last-first)/DAY)};
}
export type CalendarDay={date:string;state:'available'|'partial'|'unavailable';freeUnits:number;totalUnits:number};
export type CalendarGear={id:string;name:string;days:CalendarDay[]};
export function dayAvailability(units:{id:string;active:number}[],reservations:{unit_id:string;pickup_ms:number;return_ms:number}[],legacy:{unit_id:string;day:string}[],overdue:Set<string>,date:string):CalendarDay{
 const start=Date.parse(date+'T00:00:00+08:00'),end=start+DAY;let fullyBlocked=0,freeUnits=0;
 for(const unit of units){
  if(!unit.active||overdue.has(unit.id)){fullyBlocked++;continue;}
  const intervals=reservations.filter(r=>r.unit_id===unit.id&&r.pickup_ms<end&&r.return_ms>start).map(r=>[Math.max(start,r.pickup_ms),Math.min(end,r.return_ms)]);
  if(legacy.some(r=>r.unit_id===unit.id&&r.day===date))intervals.push([start,end]);
  if(!intervals.length){freeUnits++;continue;}
  intervals.sort((a,b)=>a[0]-b[0]);let cursor=start;
  for(const interval of intervals){if(interval[0]>cursor)break;cursor=Math.max(cursor,interval[1]);}
  if(cursor>=end)fullyBlocked++;
 }
 return {date,state:!units.length||fullyBlocked===units.length?'unavailable':freeUnits===units.length?'available':'partial',freeUnits,totalUnits:units.length};
}
export async function publicAvailability(monthValue:string|null,equipmentIds:string[],now=Date.now()){
 const month=calendarMonth(monthValue,now),list=(await catalog()).filter(g=>g.active&&equipmentIds.includes(g.id));
 if(!equipmentIds.length||equipmentIds.length>5||list.length!==equipmentIds.length)throw new ApiError(400,'Choose valid equipment to check availability.');
 const db=database(),slots=equipmentIds.map(()=>'?').join(',');
 const [u,r,l,o]=await Promise.all([
  db.prepare(`SELECT id,equipment_id,active FROM units WHERE equipment_id IN (${slots})`).bind(...equipmentIds).all<{id:string;equipment_id:string;active:number}>(),
  db.prepare(`SELECT r.unit_id,r.pickup_ms,r.return_ms FROM unit_reservations r JOIN units u ON u.id=r.unit_id WHERE u.equipment_id IN (${slots}) AND r.pickup_ms<? AND r.return_ms>?`).bind(...equipmentIds,month.last,month.first).all<{unit_id:string;pickup_ms:number;return_ms:number}>(),
  db.prepare(`SELECT r.unit_id,r.day FROM booking_days r JOIN units u ON u.id=r.unit_id WHERE u.equipment_id IN (${slots}) AND r.day>=? AND r.day<?`).bind(...equipmentIds,month.start,month.end).all<{unit_id:string;day:string}>(),
  db.prepare(`SELECT DISTINCT r.unit_id FROM unit_reservations r JOIN units u ON u.id=r.unit_id JOIN bookings b ON b.id=r.booking_id WHERE u.equipment_id IN (${slots}) AND b.status='out' AND r.return_ms<?`).bind(...equipmentIds,now).all<{unit_id:string}>()
 ]);
 const overdue=new Set(o.results.map(row=>row.unit_id));
 return {month:month.month,timezone:'Asia/Manila',checkedAt:new Date(now).toISOString(),gear:list.map(gear=>({id:gear.id,name:gear.name,days:Array.from({length:month.days},(_,i)=>dayAvailability(u.results.filter(unit=>unit.equipment_id===gear.id),r.results,l.results,overdue,new Date(month.first+i*DAY+OFFSET).toISOString().slice(0,10)))}))};
}
export async function unavailableEquipment(ids:string[],pickup:number,returned:number){
 const start=new Date(pickup+OFFSET).toISOString().slice(0,10),end=new Date(returned+OFFSET).toISOString().slice(0,10),missing:string[]=[];
 for(const id of ids)if(!await findAvailableUnit(id,pickup,returned,start,end))missing.push(id);
 return missing;
}
