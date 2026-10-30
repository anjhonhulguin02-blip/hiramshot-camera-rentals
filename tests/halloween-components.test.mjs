import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Storefront from '../app/storefront.tsx';
import RateSchedule from '../app/rate-schedule.tsx';
import Summary from '../app/book/price-summary.tsx';
import PriceDialog from '../app/price-dialog.tsx';
import {INITIAL_CATALOG} from '../lib/catalog.ts';
import {HALLOWEEN_PROMOTION,quoteWithHalloween} from '../lib/halloween-promotion.ts';
const now=Date.parse('2026-10-31T12:00:00+08:00'),render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
test('the Halloween contact-sheet design uses actual business photos, exact dates and the original logo',()=>{
 const html=render(Storefront,{user:null,initialNow:now});assert.ok(html.includes('halloween-storefront'));assert.ok(html.includes('HIRAMSHOT AFTER DARK'));assert.ok(html.includes('The night'));assert.ok(html.includes('/assets/logo.png'));for(const path of ['x5-studio.webp','x6-kit.webp','neo-detail.webp'])assert.ok(html.includes(path));for(const rate of [585,720,450])assert.ok(html.includes('₱'+rate));assert.ok(html.includes('November 3, 2026'));assert.ok(html.includes('Your return may be later'));assert.ok(!html.includes('class="gear-card"'));assert.ok(html.includes('Pause page motion'));
 const expired=render(Storefront,{user:null,initialNow:HALLOWEEN_PROMOTION.endsAt});assert.ok(!expired.includes('halloween-storefront'));assert.ok(!expired.includes('HIRAMSHOT AFTER DARK'));assert.ok(expired.includes('Borrow the gear.'));
});
test('price tiers and checkout summary show the same discounted daily rate without discounting deposits twice',()=>{
 const gear=INITIAL_CATALOG[0],schedule=render(RateSchedule,{equipment:gear,days:1,promotion:true}),quote=quoteWithHalloween(INITIAL_CATALOG,[{equipmentId:'x5',variant:'Standard',addons:['battery']}],1,{pickup:'2026-11-03T10:00:00+08:00',now}),summary=render(Summary,{quote});
 assert.ok(schedule.includes('<del>₱650/day</del>'));assert.ok(schedule.includes('₱585/day'));assert.ok(summary.includes('₱585/day × 1 day'));assert.ok(summary.includes('You save ₱65.'));assert.ok(summary.includes('₱735'));assert.ok(summary.includes('₱1,000'));assert.ok(summary.includes('₱500'));assert.ok(!summary.includes('−₱65'));
 const dialog=render(PriceDialog,{equipment:gear,days:1,start:'2026-11-04',end:'2026-11-05',campaignActive:true,promotion:false,onClose:()=>{}});assert.ok(dialog.includes('outside the Halloween promo window'));assert.ok(dialog.includes('<dd>₱650/day</dd>'));
});
