import {redirect} from 'next/navigation';
import AuthShell from '../login/auth-shell';
import {getChatGPTUser} from '../chatgpt-auth';
import {contactEmail} from '../../lib/site';
export const dynamic='force-dynamic';
export default async function ReviewAccess(){const user=await getChatGPTUser();if(!user)redirect('/login');return <AuthShell><p className="eyebrow">YOUR HIRAMSHOT ACCOUNT</p><h1>You’re signed in.</h1><p className="auth-intro">HiramShot is completing its website review. Customer booking access will open after the secure checkout setup is finished.</p><p className="auth-fine">Your sign-in worked. Signing in again with the same account will not change its review access.</p><a className="button auth-submit" href={'mailto:'+contactEmail()}>Contact HiramShot</a><p className="auth-create"><a href="/logout?return_to=%2Flogin">Use a different account</a></p></AuthShell>;}
