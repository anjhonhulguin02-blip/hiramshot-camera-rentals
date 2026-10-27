import type {NextRequest} from 'next/server';
import {authProvider} from '@hiramshot/identity';
export const runtime='nodejs';
async function handle(request:NextRequest,method:'GET'|'POST'){if(authProvider!=='google'||!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32||!process.env.AUTH_GOOGLE_ID||!process.env.AUTH_GOOGLE_SECRET)return Response.json({error:'Google sign-in is awaiting configuration.'},{status:503,headers:{'Cache-Control':'private, no-store'}});const {handlers}=await import('../../../../auth');return handlers[method](request);}
export function GET(request:NextRequest){return handle(request,'GET');}
export function POST(request:NextRequest){return handle(request,'POST');}
