import { assertSameOrigin,readBody,failure,json } from '../../../lib/api';
import { openAdminSession,requireAdmin } from '../../../lib/security';
export async function POST(request:Request){try{assertSameOrigin(request);const v=await readBody(request);const cookie=await openAdminSession(request,v?.code);return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':cookie}});}catch(e){return failure(e);}}
export async function GET(request:Request){try{await requireAdmin(request);return json({verified:true});}catch(e){return failure(e);}}
