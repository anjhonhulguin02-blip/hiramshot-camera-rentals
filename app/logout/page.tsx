import {redirect} from 'next/navigation';
import {authProvider,chatGPTSignOutPath} from '../chatgpt-auth';
import {safeReturnPath} from '../../lib/identity/navigation';
import {Header,Footer} from '../storefront';
export const dynamic='force-dynamic';
export default async function Logout({searchParams}:{searchParams:Promise<{return_to?:string}>}){const destination=safeReturnPath((await searchParams).return_to??'/');if(authProvider==='sites')redirect(chatGPTSignOutPath(destination));async function logout(){'use server';const {signOut}=await import('../../auth');await signOut({redirectTo:destination});}return <><Header/><main className="account-page wrap"><p className="eyebrow">YOUR HIRAMSHOT ACCOUNT</p><h1 className="page-title">Log out of your account.</h1><form action={logout}><button className="button">Confirm log out</button></form></main><Footer/></>;}
