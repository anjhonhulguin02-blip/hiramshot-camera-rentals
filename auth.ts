import NextAuth,{type NextAuthConfig} from 'next-auth';
import {Auth} from '@auth/core';
import Google from 'next-auth/providers/google';
import {googlePrincipal} from './lib/identity/navigation';
const authConfig:NextAuthConfig={basePath:'/api/auth',secret:process.env.AUTH_SECRET,trustHost:process.env.AUTH_TRUST_HOST==='true'||process.env.VERCEL==='1'||process.env.NODE_ENV==='development',providers:[Google({clientId:process.env.AUTH_GOOGLE_ID,clientSecret:process.env.AUTH_GOOGLE_SECRET,checks:['pkce','state','nonce']})],session:{strategy:'jwt',maxAge:8*60*60},callbacks:{signIn({account,profile}){return account?.provider==='google'&&!!googlePrincipal(profile);},jwt({token,account,profile}){if(account){const user=account.provider==='google'?googlePrincipal(profile):null;if(!user)return null;token.principal=user.userId;token.email=user.email;token.name=user.fullName;}return token;},session({session,token}){if(typeof token.principal==='string'&&token.principal.startsWith('google:'))session.user.id=token.principal;return session;}}};
export const {auth,signIn,signOut}=NextAuth(authConfig);
// Keep the original web Request. The NextAuth NextRequest URL wrapper loses
// method/body/headers under Vinext when AUTH_URL is configured.
// The Worker already enforces the canonical origin before this handler runs.
export function handleAuthRequest(request:Request){return Auth(request,authConfig);}
