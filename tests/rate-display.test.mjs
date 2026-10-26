import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Storefront from '../app/storefront.tsx';
import RateSchedule from '../app/rate-schedule.tsx';
import Wizard from '../app/book/wizard.tsx';
import {INITIAL_CATALOG} from '../lib/catalog.ts';

const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
test('compact catalog cards keep the correct rate and provide a View prices dialog trigger',()=>{
 const html=render(Storefront,{user:null});
 const cards=[...html.matchAll(/<article class="gear-card">([\s\S]*?)<\/article>/g)].map(m=>m[1]);
 assert.equal(cards.length,3);
 for(const [index,name,rate,deposit]of [[0,'Insta360 X5',650,2000],[1,'Insta360 X6',800,3000],[2,'DJI Neo 2',500,1500]]){
  assert.ok(cards[index].includes(`<h3>${name}</h3>`));
  const primary=cards[index].slice(cards[index].indexOf('<div class="gear-bottom">'));
  assert.ok(primary.includes(`<strong>₱${rate}/day</strong>`),name+' default rate');
  assert.ok(primary.includes('Standard · 1–2 days'),name+' duration disclosure');
  assert.ok(primary.includes('Refundable deposit: ₱'+deposit.toLocaleString('en-PH')));
  assert.ok(!primary.includes('From ₱'));
 }
 for(const card of cards){
  assert.ok(card.includes('aria-haspopup="dialog"'));
  assert.ok(card.includes('>View prices '));
  assert.ok(!card.includes('class="rate-schedule"'),'Full pricing should stay outside the collapsed card');
 }

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

