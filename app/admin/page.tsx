import { getChatGPTUser } from '../chatgpt-auth';
import { ensureAccount } from '../../lib/accounts';
import { eligibleAdmin } from '../../lib/security';
import { Header,Footer } from '../storefront';
import OwnerConsole from './console';
export const dynamic='force-dynamic';
export default async function Admin(){const user=await getChatGPTUser();return <><Header/><main className="account-page wrap"><p className="eyebrow">HIRAMSHOT · OWNER SPACE</p><h1 className="page-title">The rental desk.</h1><p className="account-intro">Manage reservations, verify customers, and keep every handover accountable.</p>{user&&await eligibleAdmin(user)?<OwnerConsole role={(await ensureAccount(user)).role as 'ADMIN'|'STAFF'}/>:<div className="sign-in-box"><h2>Owner access required.</h2><p>Customer records and private verification files are restricted to authorized HiramShot administrators with two-factor authentication.</p>{user?<p>Your account does not have owner access.</p>:<a className="button" href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">Sign in as owner</a>}</div>}</main><Footer/></>;}
