import {redirect} from 'next/navigation';
import {authProvider,chatGPTSignInPath} from '../chatgpt-auth';
import {safeReturnPath} from '../../lib/identity/navigation';
import {Header,Footer} from '../storefront';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{return_to?:string}>}){
 const destination=safeReturnPath((await searchParams).return_to??'/account');if(authProvider==='sites')redirect(chatGPTSignInPath(destination));
 const configured=!!(process.env.AUTH_SECRET&&process.env.AUTH_SECRET.length>=32&&process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET);
 async function login(){'use server';if(!process.env.AUTH_GOOGLE_ID||!process.env.AUTH_GOOGLE_SECRET||!process.env.AUTH_SECRET)throw new Error('Google sign-in is awaiting configuration.');const {signIn}=await import('../../auth');await signIn('google',{redirectTo:destination});}
 return <><Header/><main className="account-page wrap"><p className="eyebrow">YOUR NEXT STORY STARTS HERE</p><h1 className="page-title">Welcome to HiramShot.</h1><section className="sign-in-box"><h2>Your plans. Your gear. One account.</h2><p>Use your Google account to manage rentals and complete private verification. Your Google password stays with Google.</p>{!configured&&<p className="challenge-note">Online sign-in is awaiting setup. You can browse the gear and calculate your rental now.</p>}<form action={login}><button className="button" disabled={!configured}>Continue with Google</button></form><p className="price-detail">New clients complete a separate registration and security challenge before booking.</p></section></main><Footer/></>;
}
