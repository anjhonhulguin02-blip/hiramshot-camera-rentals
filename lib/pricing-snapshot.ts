// Read-only compatibility for prices saved before a promotion was retired.
// New rental requests always use calculateQuote and cannot activate a promotion.
export type PromotionSnapshot={id:string;name:string;percent:number;discount:number;regularTotal:number;bookedAt:string;endsAt:string};
export function savedPromotionDaily(rate:number,percent:number){return Math.round(rate*(100-percent))/100;}
export function pricingMoney(value:number){return new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);}
