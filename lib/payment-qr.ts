export type PaymentQrSettings={key:string;mime:'image/jpeg'|'image/png';sha256:string;recipientLabel:string};
export function paymentQrSettings(value?:string):PaymentQrSettings|null{
 try{const settings=JSON.parse(value||'');if(!/^business-payments\/[a-zA-Z0-9_-]+\.(jpg|png)$/.test(settings.key)||!['image/jpeg','image/png'].includes(settings.mime)||!/^\w{64}$/.test(settings.sha256)||!/^[a-f0-9]{64}$/.test(settings.sha256)||typeof settings.recipientLabel!=='string'||!settings.recipientLabel.trim()||settings.recipientLabel.length>80)return null;return settings;}catch{return null;}
}
export function reservationQrAmount(booking:{status:string;verified_at:string|null;is_demo?:number},finance:{reservationDueCentavos:number}){
 if(booking.is_demo||!booking.verified_at||!['verified','reserved','signed'].includes(booking.status))throw new Error('Complete your identity and live-call review before paying.');
 if(!Number.isSafeInteger(finance.reservationDueCentavos)||finance.reservationDueCentavos<=0)throw new Error('Your reservation downpayment has already been recorded. Refresh your booking status.');
 return finance.reservationDueCentavos;
}
