import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Storefront from '../app/storefront.tsx';
import RateSchedule from '../app/rate-schedule.tsx';
import Summary from '../app/book/price-summary.tsx';
import {INITIAL_CATALOG,calculateQuote} from '../lib/catalog.ts';
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));

test('the restored storefront and all daily rate tables contain regular prices without seasonal advertising',()=>{
 const html=render(Storefront,{user:null});
 assert.ok(html.includes('Borrow the gear.'));assert.ok(html.includes('Own the'));assert.ok(html.includes('/assets/logo.png'));
 assert.ok(html.includes('gear-journey'));assert.ok(html.includes('Pause page motion'));
 assert.ok(!/Halloween|After Dark|halloween-|afterdark-|10% OFF/i.test(html));
 for(const gear of INITIAL_CATALOG){
  const schedule=render(RateSchedule,{equipment:gear,days:2});
  for(const variant of gear.variants)for(const tier of variant.tiers)assert.ok(schedule.includes('₱'+tier.max+'/day'));
  assert.ok(!schedule.includes('<del>'));assert.ok(!schedule.includes('10%'));
 }
 const quote=calculateQuote(INITIAL_CATALOG,[{equipmentId:'x5',variant:'Standard',addons:['battery']}],2),summary=render(Summary,{quote});
 assert.equal(quote.totalMax,1600);assert.equal(quote.depositMax,1000);
 assert.ok(summary.includes('₱650/day × 2 days'));assert.ok(summary.includes('₱1,600'));assert.ok(!summary.includes('off applied'));
});

test('a previously saved quote retains its agreed total without advertising a new promotion',()=>{
 const quote=calculateQuote(INITIAL_CATALOG,[{equipmentId:'x5',variant:'Standard',addons:['battery']}],2);
 Object.assign(quote,{totalMin:1470,totalMax:1470,reservationMin:500,reservationMax:500,promotion:{id:'halloween-2026',name:'HiramShot After Dark',percent:10,discount:130,regularTotal:1600,bookedAt:'2026-10-31T04:00:00Z',endsAt:'2026-11-03T16:00:00Z'}});
 const before=JSON.stringify(quote),html=render(Summary,{quote});assert.equal(JSON.stringify(quote),before);
 assert.ok(html.includes('this saved booking'));assert.ok(html.includes('₱585/day × 2 days'));assert.ok(html.includes('₱1,470'));assert.ok(!html.includes('Book and pick up by'));
});
