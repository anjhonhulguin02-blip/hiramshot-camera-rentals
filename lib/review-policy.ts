export const REVIEW_STATUSES=['PENDING','PUBLISHED','HIDDEN','REJECTED'] as const;
export function reviewInput(value:Record<string,unknown>){
 if(!Number.isInteger(value.rating)||Number(value.rating)<1||Number(value.rating)>5)throw new Error('Choose a rating from 1 to 5 stars.');
 if(typeof value.text!=='string'||value.text.trim().length<8||value.text.trim().length>2000||/[\u0000-\u0008\u000b-\u001f]/.test(value.text))throw new Error('Write a review between 8 and 2,000 characters.');
 if(typeof value.displayName!=='string'||value.displayName.trim().length<2||value.displayName.trim().length>40||/[\u0000-\u001f@]/.test(value.displayName))throw new Error('Choose a public display name, without your email address.');
 if(value.publicConsent!==true)throw new Error('Confirm that your review and selected media may be published after moderation.');
 return {rating:Number(value.rating),text:value.text.trim(),displayName:value.displayName.trim()};
}
export const MOST_RENTED_SQL=`SELECT bi.equipment_id,COUNT(DISTINCT b.id) AS rental_count
 FROM booking_items bi JOIN bookings b ON b.id=bi.booking_id
 WHERE b.is_demo=0 AND b.status IN ('out','cleared','returned')
 GROUP BY bi.equipment_id ORDER BY rental_count DESC,bi.equipment_id LIMIT 3`;
export function reviewMediaReady(settings:{REVIEW_MEDIA_ENABLED?:string;REVIEW_MEDIA_PROCESSOR_URL?:string;REVIEW_MEDIA_PROCESSOR_TOKEN?:string;TURNSTILE_SITE_KEY?:string;TURNSTILE_SECRET_KEY?:string;BUCKET?:unknown}){return settings.REVIEW_MEDIA_ENABLED==='true'&&!!settings.BUCKET&&!!settings.REVIEW_MEDIA_PROCESSOR_URL?.startsWith('https://')&&(settings.REVIEW_MEDIA_PROCESSOR_TOKEN?.length||0)>=32&&!!settings.TURNSTILE_SITE_KEY&&!!settings.TURNSTILE_SECRET_KEY;}
export const INSERT_REVIEW_MEDIA_SQL=`INSERT INTO review_media(id,review_id,object_key,mime,size,sha256,scan_status,created_at)
 SELECT ?,?,?,?,?,?,'CLEAN',? WHERE EXISTS(SELECT 1 FROM reviews WHERE id=? AND client_id=? AND status='PENDING' AND version=? AND public_consent_at IS NOT NULL)
 AND (SELECT COUNT(*) FROM review_media WHERE review_id=? AND deleted_at IS NULL)<4`;
export const BUMP_REVIEW_MEDIA_VERSION_SQL=`UPDATE reviews SET version=version+1,updated_at=?
 WHERE id=? AND version=? AND status='PENDING' AND EXISTS(SELECT 1 FROM review_media WHERE id=? AND review_id=reviews.id)`;
export function reviewByteRange(value:string|null,size:number){if(!value)return null;const match=/^bytes=(\d*)-(\d*)$/.exec(value);if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(size)||size<1)throw new Error('Invalid range');let start:number,end:number;if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<1)throw new Error('Invalid range');start=Math.max(0,size-suffix);end=size-1;}else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)throw new Error('Invalid range');end=Math.min(end,size-1);}return {offset:start,length:end-start+1};}
