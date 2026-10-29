import {env} from '@hiramshot/runtime';
import NextAuth,{type NextAuthConfig} from 'next-auth';
import {Auth} from '@auth/core';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import {googlePrincipal,isRentalPrincipal} from './lib/identity/navigation';
import {passwordReady} from './lib/password-settings';
const providers:NextAuthConfig['providers']=[];
if(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET)providers.push(Google({clientId:process.env.AUTH_GOOGLE_ID,clientSecret:process.env.AUTH_GOOGLE_SECRET,checks:['pkce','state','nonce']}));
if(passwordReady(process.env,typeof env.AUTH_EMAIL?.send==='function'))providers.push(Credentials({credentials:{email:{},password:{},turnstileToken:{}},async authorize(credentials,request){const {passwordSignIn}=await import('./lib/password-auth');return passwordSignIn(credentials,request);}}));
const authConfig:NextAuthConfig={basePath:'/api/auth',secret:process.env.AUTH_SECRET,trustHost:process.env.AUTH_TRUST_HOST==='true'||process.env.VERCEL==='1'||process.env.NODE_ENV==='development',providers,session:{strategy:'jwt',maxAge:8*60*60},callbacks:{
 signIn({account,profile,user}){return account?.provider==='google'?!!googlePrincipal(profile):account?.provider==='credentials'&&!!user?.id&&isRentalPrincipal(user.id);},
 async jwt({token,account,profile,user}){
  if(account?.provider==='google'){const principal=googlePrincipal(profile);if(!principal)return null;token.principal=principal.userId;token.email=principal.email;token.name=principal.fullName;token.authMethod='google';token.emailVerified=true;delete token.credentialId;delete token.credentialVersion;}
  else if(account?.provider==='credentials'){const credential=user as typeof user&{credentialId?:string;credentialVersion?:number};if(!credential.id||!credential.email||!credential.credentialId||typeof credential.credentialVersion!=='number')return null;token.principal=credential.id;token.email=credential.email;token.name=credential.name;token.authMethod='password';token.emailVerified=true;token.credentialId=credential.credentialId;token.credentialVersion=credential.credentialVersion;}
  if(token.authMethod==='password'){const {passwordSessionValid}=await import('./lib/password-auth');if(!await passwordSessionValid({credentialId:token.credentialId,credentialVersion:token.credentialVersion,principal:token.principal}))return null;}
  return token;
 },
 session({session,token}){if(isRentalPrincipal(token.principal))session.user.id=token.principal as string;return session;},
}};
export const {auth,signIn,signOut}=NextAuth(authConfig);
// Keep the original web Request. The NextAuth NextRequest URL wrapper loses
// method/body/headers under Vinext when AUTH_URL is configured.
// The Worker already enforces the canonical origin before this handler runs.
export function handleAuthRequest(request:Request){return Auth(request,authConfig);}
