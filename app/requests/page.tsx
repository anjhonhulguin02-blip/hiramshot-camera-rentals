import { getChatGPTUser } from '../chatgpt-auth';
import { Header, Footer } from '../storefront';
import RequestList from './request-list';
export const dynamic = 'force-dynamic';
export default async function Requests() {
  const user = await getChatGPTUser();
  return <><Header /><main className="account-page wrap"><p className="eyebrow">YOUR NEXT ADVENTURE</p><h1>My rental requests.</h1><p className="account-intro">Your dates, your gear, and the latest update. A pending request is not yet a confirmed rental.</p>{user ? <><div className="account-toolbar"><span>Signed in as {user.email}</span><a className="text-link" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a></div><RequestList /></> : <div className="empty-state"><h2>Your plans, all in one place.</h2><p>Sign in to see and manage your rental requests.</p><a className="button" href="/signin-with-chatgpt?return_to=%2Frequests" target="_top">Sign in to continue</a></div>}</main><Footer /></>;
}
