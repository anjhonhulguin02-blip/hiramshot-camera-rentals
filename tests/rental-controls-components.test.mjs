import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RentalCalendarView,bookingsOnDate} from '../app/admin/rental-calendar.tsx';
import CancelBooking from '../app/cancel-booking.tsx';
import {GearJourney,CinematicHero} from '../app/cinematic-experience.tsx';
import {INITIAL_CATALOG} from '../lib/catalog.ts';
import Wizard from '../app/book/wizard.tsx';
import AvailabilityCalendar from '../app/book/availability-calendar.tsx';
import {todayManila} from '../lib/rental.ts';
import {monthLabel} from '../lib/calendar-display.ts';
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
test('rental calendar shows gear and pending status, with a separate agenda and exact return boundary',()=>{
 const booking={id:'synthetic',reference:'HSR-SYNTHETIC',name:'Synthetic Client',status:'reserved',pickup:'2026-11-05T09:00:00+08:00',return:'2026-11-07T00:00:00+08:00',items:[{equipmentId:'neo2',variant:'Fly More Combo'}]},data={month:'2026-11',gear:INITIAL_CATALOG.map(g=>({id:g.id,name:g.name})),holds:[],bookings:[booking,{...booking,id:'pending',status:'verification'}]};
 assert.equal(bookingsOnDate(data.bookings,'2026-11-06').length,2);assert.equal(bookingsOnDate(data.bookings,'2026-11-07').length,0);
 const html=render(RentalCalendarView,{month:'2026-11',data,date:'2026-11-06',onMonth(){},onDate(){},onOpen(){}});for(const text of ['November 2026','DJI Neo 2','Request · not reserved','HSR-SYNTHETIC','Asia/Manila','Open booking'])assert.ok(html.includes(text));assert.ok(html.includes('aria-pressed="true"'));
});
test('cancel is offered only before signing, and Neo package previews are explicit buttons',()=>{
 const booking={id:'synthetic',quote:{totalMax:1300}};for(const status of ['requested','verification','verified','reserved'])assert.ok(render(CancelBooking,{booking:{...booking,status},onCancelled(){}}).includes('Cancel booking'));for(const status of ['signed','out','returned','cancelled'])assert.equal(render(CancelBooking,{booking:{...booking,status},onCancelled(){}}),'');
 const html=render(GearJourney,{catalog:INITIAL_CATALOG,paused:true,onPrices(){}});assert.ok(html.includes('Preview DJI Neo 2 Fly More Combo kit'));assert.ok(html.includes('Preview RC + extra batteries'));assert.ok(html.includes('aria-pressed="true"'));
 const hero=render(CinematicHero,{paused:true,reduced:true,onToggle(){}});assert.ok(!hero.includes('Pause page motion'));assert.ok(!hero.includes('See the gear in motion'));assert.ok(hero.includes('Find your gear'));
});

test('gear-only booking links render before dates are selected, including empty and malformed date queries',()=>{
 for(const initial of [{gear:'x5'},{gear:'x6',start:'',end:''},{gear:'neo2',start:'not-a-date'},{gear:'x5',start:'2026-99-99'},{}]){
  const html=render(Wizard,{catalog:INITIAL_CATALOG,user:null,initial});
  assert.ok(html.includes('Choose your perspective.'));assert.ok(html.includes('Equipment availability'));assert.ok(html.includes('Sign in to book'));
 }
});

test('availability calendar falls back to the current Manila month for partial or invalid pickup dates',()=>{
 for(const pickup of ['', 'T09:00:00+08:00','2026-99-99T09:00:00+08:00','2026-02-30T09:00:00+08:00']){
  const html=render(AvailabilityCalendar,{equipment:['x5'],pickup,returned:'',onPickup(){},onAvailability(){}});
  assert.ok(html.includes(monthLabel(todayManila().slice(0,7))));
 }
 const html=render(AvailabilityCalendar,{equipment:['x5'],pickup:'2026-11-05T09:00:00+08:00',returned:'2026-11-06T09:00:00+08:00',onPickup(){},onAvailability(){}});
 assert.ok(html.includes('November 2026'));
});
