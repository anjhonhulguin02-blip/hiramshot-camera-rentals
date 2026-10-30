import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_CATALOG,calculateQuote} from '../lib/catalog';
import {HALLOWEEN_PROMOTION,halloweenActive,halloweenPickupEligible,quoteWithHalloween,halloweenDaily} from '../lib/halloween-promotion';
const now=Date.parse('2026-10-31T12:00:00+08:00'),pickup='2026-11-03T12:00:00+08:00';
test('Halloween booking and pickup deadlines use inclusive November 3 in Philippine time',()=>{
 assert.equal(halloweenActive(HALLOWEEN_PROMOTION.startsAt-1),false);assert.equal(halloweenActive(HALLOWEEN_PROMOTION.startsAt),true);assert.equal(halloweenActive(HALLOWEEN_PROMOTION.endsAt-1),true);assert.equal(halloweenActive(HALLOWEEN_PROMOTION.endsAt),false);
 for(const value of ['2026-11-03','2026-11-03T23:59:59+08:00','2026-11-03T15:59:59Z'])assert.equal(halloweenPickupEligible(value,now),true,value);
 for(const value of ['2026-11-04','2026-11-03T16:00:00Z','https://evil.invalid','2026-11-03T10:00:00-08:00'])assert.equal(halloweenPickupEligible(value,now),false,value);
 assert.equal(halloweenPickupEligible(pickup,HALLOWEEN_PROMOTION.endsAt),false);
});
test('every fixed gear tier receives exactly ten percent off while deposits and add-ons remain regular',()=>{
 for(const gear of INITIAL_CATALOG)for(const variant of gear.variants)for(const days of [1,2,3,6,7,30]){
  const selected=[{equipmentId:gear.id,variant:variant.name,addons:['battery']}],base=calculateQuote(INITIAL_CATALOG,selected,days),quote=quoteWithHalloween(INITIAL_CATALOG,selected,days,{pickup,now}),daily=base.lines[0].dailyMax!;
  assert.equal(quote.totalMax,halloweenDaily(daily)*days+150*days);assert.equal(quote.promotion?.discount,daily*days*.1);assert.equal(quote.depositMax,base.depositMax);assert.equal(quote.lines[0].addonMax,150*days);assert.equal(quote.reservationMax,Math.max(500,Math.ceil(quote.totalMax!*.3)));assert.equal(quote.promotion?.bookedAt,new Date(now).toISOString());
 }
});
test('the existing combo discount stacks once and centavo rounding stays exact',()=>{
 const items=[{equipmentId:'x5',variant:'Standard',addons:[]},{equipmentId:'neo2',variant:'Standard',addons:[]}],quote=quoteWithHalloween(INITIAL_CATALOG,items,1,{pickup,now});assert.equal(quote.totalMax,885);assert.equal(quote.discount,150);assert.equal(quote.promotion?.discount,115);assert.equal(quote.depositMax,1800);assert.equal(quote.reservationMax,500);
 const catalog=structuredClone(INITIAL_CATALOG);catalog[0].variants[0].tiers.forEach(tier=>{tier.min=651;tier.max=651;});const precise=quoteWithHalloween(catalog,[items[0]],3,{pickup,now});assert.equal(precise.totalMax,1757.7);assert.equal(precise.promotion?.discount,195.3);
});
test('expired or ineligible new requests use regular rates and saved quotes remain unchanged',()=>{
 const items=[{equipmentId:'x5',variant:'Standard',addons:[]}],saved=quoteWithHalloween(INITIAL_CATALOG,items,7,{pickup,now}),copy=JSON.stringify(saved);
 for(const context of [{pickup:'2026-11-04T10:00:00+08:00',now},{pickup,now:HALLOWEEN_PROMOTION.endsAt}]){const quote=quoteWithHalloween(INITIAL_CATALOG,items,7,context);assert.equal(quote.totalMax,3150);assert.equal(quote.promotion,undefined);}
 assert.equal(JSON.stringify(saved),copy);assert.equal(saved.totalMax,2835);
});
