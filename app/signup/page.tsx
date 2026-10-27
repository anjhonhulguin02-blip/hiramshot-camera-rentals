import {getChatGPTUser} from '../chatgpt-auth';
import {Header,Footer} from '../storefront';
import {ensureAccount,RegistrationRequiredError} from '../../lib/accounts';
import {redirect} from 'next/navigation';
import Registration from './registration';
export const dynamic='force-dynamic';
export default async function Signup(){
 const user=await getChatGPTUser();if(user){try{await ensureAccount(user);redirect('/account');}catch(error){if(!(error instanceof RegistrationRequiredError))throw error;}}
 return <><Header/><main className="account-page wrap"><p className="eyebrow">WELCOME TO HIRAMSHOT</p><h1 className="page-title">Create your rental account.</h1>{user?<Registration name={user.fullName||user.displayName} email={user.email}/>:<div className="sign-in-box"><h2>Start with secure sign-in.</h2><p>Sign in securely, then complete the HiramShot registration form and security challenge.</p><a className="button" href="/login?return_to=%2Fsignup" target="_top">Continue to account registration</a></div>}</main><Footer/></>;
}
