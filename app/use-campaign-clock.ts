'use client';
import {useEffect,useRef,useState} from 'react';
import {HALLOWEEN_PROMOTION} from '../lib/halloween-promotion';
export function useCampaignClock(seed?:number){
 const initial=useRef(seed??Date.now()).current,[now,setNow]=useState(initial);
 useEffect(()=>{const started=performance.now(),update=()=>setNow(initial+performance.now()-started),interval=window.setInterval(update,60000),remaining=HALLOWEEN_PROMOTION.endsAt-initial,expiry=remaining>0&&remaining<2147483647?window.setTimeout(update,remaining+20):undefined;return()=>{window.clearInterval(interval);if(expiry!==undefined)window.clearTimeout(expiry);};},[initial]);
 return now;
}
