import { getChatGPTUser } from '../chatgpt-auth';
import { Header,Footer } from '../storefront';
import { catalog } from '../../lib/booking';
import Wizard from './wizard';
export const dynamic='force-dynamic';
export default async function Book({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const user=await getChatGPTUser(),params=await searchParams;return <><Header/><main className="account-page wrap"><p className="eyebrow">THE NEXT CHAPTER STARTS HERE</p><h1 className="page-title">Make it a HiramShot trip.</h1><p>Choose your gear. See every charge. Follow your booking from reservation to return.</p><Wizard catalog={await catalog()} user={user?{name:user.displayName,email:user.email}:null} initial={params}/></main><Footer/></>;}
