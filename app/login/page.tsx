import {env} from '@hiramshot/runtime';
import {redirect} from 'next/navigation';
import {authProvider,chatGPTSignInPath} from '../chatgpt-auth';
import {safeReturnPath} from '../../lib/identity/navigation';
import AuthShell from './auth-shell';
import {LoginForm} from './forms';
import {passwordReady} from '../../lib/password-settings';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{return_to?:string}>}){
 const destination=safeReturnPath((await searchParams).return_to??'/account');if(authProvider==='sites')redirect(chatGPTSignInPath(destination));
 const configured=!!(process.env.AUTH_SECRET&&process.env.AUTH_SECRET.length>=32&&process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET);
 async function login(){'use server';if(!process.env.AUTH_GOOGLE_ID||!process.env.AUTH_GOOGLE_SECRET||!process.env.AUTH_SECRET)throw new Error('Google sign-in is awaiting configuration.');const {signIn}=await import('../../auth');await signIn('google',{redirectTo:destination});}
 return <AuthShell><LoginForm ready={passwordReady(process.env,typeof env.AUTH_EMAIL?.send==='function')} siteKey={process.env.TURNSTILE_SITE_KEY||null} destination={destination} googleReady={configured} googleAction={login}/></AuthShell>;
}
