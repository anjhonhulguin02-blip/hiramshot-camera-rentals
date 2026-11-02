import {ChevronLeft,ChevronRight} from 'lucide-react';
import {monthLabel,shiftMonth} from '../lib/calendar-display';
export default function CalendarHeading({month,onChange,label='Rental calendar'}:{month:string;onChange:(month:string)=>void;label?:string}){
 return <div className="calendar-heading"><div><p className="eyebrow">{label}</p><h3 aria-live="polite">{monthLabel(month)}</h3></div><div className="calendar-controls"><button type="button" className="icon-button" aria-label="Previous month" onClick={()=>onChange(shiftMonth(month,-1))}><ChevronLeft/></button><button type="button" className="icon-button" aria-label="Next month" onClick={()=>onChange(shiftMonth(month,1))}><ChevronRight/></button></div></div>;
}
