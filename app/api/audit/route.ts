import { env } from '@hiramshot/runtime';
import { database,failure,json } from '../../../lib/api';
import { requireAdmin,audit,verifyMac,requireSecret } from '../../../lib/security';
export async function GET(request:Request){try{const u=await requireAdmin(request),result=await database().prepare('SELECT * FROM security_events ORDER BY created_at DESC LIMIT 200').all<Record<string,string>>(),events=await Promise.all(result.results.map(async r=>({...r,integrityValid:await verifyMac(JSON.stringify({id:r.id,actor:r.actor,ip:r.ip,bookingId:r.booking_id,action:r.action,createdAt:r.created_at}),r.mac,requireSecret(env.AUDIT_HMAC_KEY,'Audit protection'))})));await audit(request,u.userId,'','audit.view');return json({events});}catch(e){return failure(e);}}
