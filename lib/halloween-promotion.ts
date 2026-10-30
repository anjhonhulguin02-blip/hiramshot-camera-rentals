import {calculateQuote,type Equipment,type Selection,type Quote} from './catalog';

export const HALLOWEEN_PROMOTION={id:'halloween-2026',name:'HiramShot After Dark',percent:10,startsAt:Date.parse('2026-10-30T00:00:00+08:00'),endsAt:Date.parse('2026-11-04T00:00:00+08:00'),deadline:'November 3, 2026 · 11:59 PM PHT'} as const;
export type PromotionSnapshot={id:string;name:string;percent:number;discount:number;regularTotal:number;bookedAt:string;endsAt:string};
export function halloweenActive(now=Date.now()){return Number.isFinite(now)&&now>=HALLOWEEN_PROMOTION.startsAt&&now<HALLOWEEN_PROMOTION.endsAt;}
export function halloweenPickupEligible(pickup:string,now=Date.now()){
 const value=/^\d{4}-\d{2}-\d{2}$/.test(pickup)?pickup+'T00:00:00+08:00':pickup;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?(?:\+08:00|Z)$/.test(value))return false;
 const ms=Date.parse(value);return halloweenActive(now)&&Number.isFinite(ms)&&ms>=HALLOWEEN_PROMOTION.startsAt&&ms<HALLOWEEN_PROMOTION.endsAt;
}
export function halloweenDaily(rate:number){return Math.round(rate*90)/100;}
export function halloweenMoney(value:number){return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);}
export function quoteWithHalloween(catalog:Equipment[],items:Selection[],days:number,context:{pickup:string;now?:number}):Quote{
 const quote=calculateQuote(catalog,items,days);if(quote.custom||quote.totalMin===null||quote.totalMax===null)throw new Error('A fixed rate is unavailable. Contact HiramShot before booking.');
 const now=context.now??Date.now();if(!halloweenPickupEligible(context.pickup,now))return quote;
 // Integer centavos keep the campaign separate from add-ons, refundable deposits
 // and the existing PHP150/day camera-and-drone combo discount.
 const gearCentavos=quote.lines.reduce((sum,line)=>sum+Math.round(line.dailyMax!*100)*days,0),discountCentavos=Math.round(gearCentavos*HALLOWEEN_PROMOTION.percent/100),discount=discountCentavos/100;
 const total=Math.max(0,Math.round(quote.totalMax*100-discountCentavos)/100),minimum=Math.max(0,Math.round(quote.totalMin*100-discountCentavos)/100);
 return {...quote,totalMin:minimum,totalMax:total,reservationMin:Math.max(500,Math.ceil(minimum*.3)),reservationMax:Math.max(500,Math.ceil(total*.3)),promotion:{id:HALLOWEEN_PROMOTION.id,name:HALLOWEEN_PROMOTION.name,percent:10,discount,regularTotal:quote.totalMax,bookedAt:new Date(now).toISOString(),endsAt:new Date(HALLOWEEN_PROMOTION.endsAt).toISOString()}};
}
