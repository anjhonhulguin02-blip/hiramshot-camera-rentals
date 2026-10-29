import { getChatGPTUser } from '../chatgpt-auth';
import { Header, Footer } from '../storefront';
import ClientPortal from './portal';
export const dynamic = 'force-dynamic';
export default async function Account() {
  const user = await getChatGPTUser();
  return <><Header /><main className="account-page wrap"><p className="eyebrow">YOUR HIRAMSHOT ACCOUNT</p><h1 className="page-title">Your rental home.</h1>{user ? <ClientPortal /> : <div className="sign-in-box"><h2>Your plans. Your gear. One account.</h2><p>Manage your profile, complete private verification, track rentals, and review payment history.</p><div className="inline-actions"><a className="button" href="/login?return_to=%2Faccount" target="_top">Log in securely</a><a className="button secondary" href="/create-account">Create an account</a></div><p className="price-detail">Sign in with your email and password or continue with Google, then complete your HiramShot profile.</p></div>}</main><Footer /></>;
}
