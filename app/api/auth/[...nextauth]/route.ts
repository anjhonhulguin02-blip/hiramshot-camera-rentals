import type {NextRequest} from 'next/server';
import {authProvider} from '@hiramshot/identity';
import {passwordReady} from '../../../../lib/password-settings';
import {boundedAuthRequest} from '../../../../lib/auth-request';
export const runtime='nodejs';
async function handle(request:NextRequest){if(authProvider!=='google'||!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32||!((process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET)||passwordReady(process.env)))return Response.json({error:'Sign-in is awaiting configuration.'},{status:503,headers:{'Cache-Control':'private, no-store'}});let original:Request;try{original=await boundedAuthRequest(request);}catch(error){const reason=(error as Error).message;return Response.json({error:'Sign-in request rejected.',code:reason==='size'?'request_too_large':reason==='origin'?'origin_rejected':'request_read_failed'},{status:reason==='size'?413:reason==='origin'?403:500});}const {handleAuthRequest}=await import('../../../../auth');return handleAuthRequest(original);}
export function GET(request:NextRequest){return handle(request);}
export function POST(request:NextRequest){return handle(request);}
