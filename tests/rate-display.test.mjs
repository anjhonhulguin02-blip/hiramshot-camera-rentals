import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Storefront from '../app/storefront.tsx';
import RateSchedule from '../app/rate-schedule.tsx';
import Wizard from '../app/book/wizard.tsx';
import {INITIAL_CATALOG} from '../lib/catalog.ts';
import {CinematicHero,GearJourney} from '../app/cinematic-experience.tsx';

const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
test('cinematic booking links retain selected dates and the film viewer respects active gear',()=>{
 const dates={start:'2099-10-31',end:'2099-11-03'};
 const html=render(CinematicHero,{...dates,paused:true,onToggle:()=>{}})+render(GearJourney,{...dates,catalog:INITIAL_CATALOG,paused:true,onPrices:()=>{}});
 const links=[...html.matchAll(/href="(\/book\?[^\"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;','&'),'https://example.invalid'));
 assert.equal(links.length,6);for(const link of links){assert.equal(link.searchParams.get('start'),dates.start);assert.equal(link.searchParams.get('end'),dates.end);}
 const inactive=render(GearJourney,{catalog:INITIAL_CATALOG.map(gear=>({...gear,active:gear.id==='x5'})),paused:true,onPrices:()=>{}});
 assert.ok(inactive.includes('/book?gear=x5'));assert.ok(!inactive.includes('/book?gear=x6'));assert.ok(!inactive.includes('/book?gear=neo2'));
});
test('one animated showcase exposes exact prices, deposits and pricing dialogs for every package',()=>{
 const html=render(Storefront,{user:null});assert.ok(!html.includes('class="gear-card"'));assert.ok(html.includes('id="gear"'));assert.ok(html.includes('id="in-motion"'));
 for(const [id,rate,deposit]of [['x5',650,1000],['x6',800,1500],['neo2',500,800]]){const chapter=html.slice(html.indexOf('id="perspective-'+id+'"')).split('</article>')[0];assert.ok(chapter.includes('₱'+rate+'/day'));assert.ok(chapter.includes('Refundable deposit: ₱'+deposit.toLocaleString('en-PH')));assert.ok(chapter.includes('aria-haspopup="dialog"'));}
 const drone=html.slice(html.indexOf('id="perspective-neo2"')).split('</article>')[0];assert.ok(drone.includes('Fly More Combo'));assert.ok(drone.includes('₱700/day'));
 const sixDays=render(GearJourney,{catalog:INITIAL_CATALOG,paused:true,days:6,onPrices:()=>{}});for(const rate of [550,700,450,600])assert.ok(sixDays.includes('₱'+rate+'/day'));
});

test('selected duration highlights the applicable tier for every package',()=>{
 for(const [id,variant,days,rate]of [['x5','Standard',1,650],['x5','Standard',3,550],['x5','Standard',7,450],['x6','Standard',1,800],['x6','Standard',3,700],['x6','Standard',7,600],['neo2','Standard',1,500],['neo2','Standard',3,450],['neo2','Standard',7,350],['neo2','Fly More Combo',1,700],['neo2','Fly More Combo',3,600],['neo2','Fly More Combo',7,500]]){
  const html=render(RateSchedule,{equipment:INITIAL_CATALOG.find(g=>g.id===id),variantName:variant,days});
  const current=html.match(/class="rate-tier current">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(current?.includes(`<dd>₱${rate}/day</dd>`),`${id}/${variant}/${days}`);
 }
});
test('booking summary uses the same X5/X6/drone duration rates shown in the catalog',()=>{
 const start=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 for(const [id,days,rate]of [['x5',1,650],['x5',3,550],['x5',7,450],['x6',1,800],['x6',3,700],['x6',7,600],['neo2',1,500],['neo2',3,450],['neo2',7,350]]){
  const end=new Date(Date.parse(start+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);
  const html=render(Wizard,{catalog:INITIAL_CATALOG,user:null,initial:{gear:id,start,end}});
  const summary=html.slice(html.indexOf('<aside class="price-summary">'));
  assert.ok(summary.includes(`₱${rate}/day × ${days} day`),`${id}/${days} daily calculation`);
  assert.ok(summary.includes('₱'+(days*rate).toLocaleString('en-PH')),`${id}/${days} total`);
 }
});

