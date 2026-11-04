'use client';
import {useState,type ImgHTMLAttributes} from 'react';
import {publicMediaUrl} from '../lib/public-assets';
export default function AssetImage({src,onError,...props}:Omit<ImgHTMLAttributes<HTMLImageElement>,'src'> & {src:string}){
 const [retryFor,setRetryFor]=useState<string|null>(null),retried=retryFor===src;
 return <img {...props} src={publicMediaUrl(src,retried)} onError={event=>{
  if(!retried&&src.startsWith('/assets/'))setRetryFor(src);
  onError?.(event);
 }}/>;
}
