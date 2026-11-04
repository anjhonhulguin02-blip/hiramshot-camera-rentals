export const PUBLIC_MEDIA_VERSION='20261103';
export function publicMediaUrl(source:string,retry=false){
 if(!source.startsWith('/assets/'))return source;
 const url=new URL(source,'https://assets.invalid');
 if(!url.pathname.startsWith('/assets/'))return source;
 url.searchParams.set('v',PUBLIC_MEDIA_VERSION);
 if(retry)url.searchParams.set('retry','1');
 return url.pathname+url.search+url.hash;
}

// Only successful, cookie-free static media/code can be cached publicly.
export function responseCacheControl(path:string,status:number,type:string|null,hasCookie=false){
 const asset=path.startsWith('/assets/')||path.startsWith('/_next/static/');
 const staticType=/^(?:image\/|video\/|audio\/|font\/|text\/css(?:;|$)|(?:application|text)\/(?:javascript|x-javascript)(?:;|$)|application\/(?:font-woff|vnd\.ms-fontobject)(?:;|$))/i.test(type||'');
 return asset&&(status===200||status===206)&&staticType&&!hasCookie?'public, max-age=86400, stale-while-revalidate=604800':'private, no-store';
}
