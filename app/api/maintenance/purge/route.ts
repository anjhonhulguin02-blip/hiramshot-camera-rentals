import { env } from '@hiramshot/runtime';
import { failure,json,ApiError,assertSameOrigin } from '../../../../lib/api';
import { requireAdmin,audit,requireSecret,verifyMac } from '../../../../lib/security';
import { purgeExpired } from '../../../../lib/purge';
export async function POST(request:Request){try{const token=request.headers.get('x-maintenance-token');if(token){const [timestamp,sig]=token.split('~');if(!/^\d+$/.test(timestamp)||Math.abs(Date.now()-Number(timestamp))>60000||!await verifyMac('purge:'+timestamp,sig,requireSecret(env.PURGE_SECRET,'Retention runner')))throw new ApiError(403,'Invalid maintenance authorization.');}else{assertSameOrigin(request);const u=await requireAdmin(request);await audit(request,u.userId,'','retention.run');}return json(await purgeExpired(env));}catch(e){return failure(e);}}
