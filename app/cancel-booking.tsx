'use client';
import {useEffect,useRef,useState} from 'react';
import {X,CalendarX2} from 'lucide-react';
type Booking={id:string;status:string;booking_reference_code?:string;quote:{totalMax:number|null};reservation_paid?:number;paid_total?:number};
export default function CancelBooking({booking,onCancelled}:{booking:Booking;onCancelled:()=>void|Promise<void>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
 if(!['requested','verification','verified','reserved'].includes(booking.status))return null;
 async function cancel(){setBusy(true);setError('');try{
  const response=await fetch('/api/bookings/'+booking.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel'}),signal:AbortSignal.timeout(20000)}),data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Unable to cancel. Refresh the booking and try again.');
  setOpen(false);await onCancelled();
 }catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <><button type="button" className="text-link cancel-booking-link" onClick={()=>{setError('');setOpen(true);}}><CalendarX2 size={16} aria-hidden="true"/>Cancel booking</button>{open&&<dialog ref={dialog} className="action-dialog" aria-labelledby={'cancel-title-'+booking.id} onCancel={event=>{if(busy)event.preventDefault();else setOpen(false);}} onClose={()=>setOpen(false)}><button type="button" className="icon-button action-dialog-close" aria-label="Close cancellation" disabled={busy} onClick={()=>setOpen(false)}><X/></button><p className="eyebrow">CHANGE OF PLANS</p><h2 id={'cancel-title-'+booking.id}>Cancel this booking?</h2><p className="booking-reference">{booking.booking_reference_code||booking.id.slice(0,8).toUpperCase()}</p><p>This releases any equipment reserved for this request. You can create a new booking with different gear or dates.</p><p>Any payment already made is handled by HiramShot under the cancellation policy. Cancelling does not automatically issue a refund.</p>{error&&<p className="error-text" role="alert">{error}</p>}<div className="inline-actions"><button className="button danger" disabled={busy} onClick={cancel}>{busy?'Cancelling…':'Yes, cancel booking'}</button><button className="button secondary" disabled={busy} onClick={()=>setOpen(false)}>Keep booking</button></div></dialog>}</>;
}
