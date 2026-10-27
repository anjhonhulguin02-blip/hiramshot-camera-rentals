import 'server-only';
import {redirect} from 'next/navigation';
import {safeReturnPath} from './navigation';
import type {ChatGPTUser} from './types';
export type {ChatGPTUser} from './types';
export const authProvider:string='google';
export function googleAuthConfigured(){return !!(process.env.AUTH_SECRET&&process.env.AUTH_SECRET.length>=32&&process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET);}
export async function getChatGPTUser():Promise<ChatGPTUser|null>{if(!googleAuthConfigured())return null;const {auth}=await import('../../auth');const session=await auth();if(!session?.user?.id?.startsWith('google:')||!session.user.email)return null;return {userId:session.user.id,email:session.user.email,fullName:session.user.name??null,displayName:session.user.name||session.user.email};}
export async function requireChatGPTUser(returnTo:string){const user=await getChatGPTUser();if(user)return user;redirect(chatGPTSignInPath(returnTo));}
export function chatGPTSignInPath(returnTo:string){return '/login?return_to='+encodeURIComponent(safeReturnPath(returnTo));}
export function chatGPTSignOutPath(returnTo='/'){return '/logout?return_to='+encodeURIComponent(safeReturnPath(returnTo));}
