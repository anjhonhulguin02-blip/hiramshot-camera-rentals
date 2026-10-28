import AuthShell from '../login/auth-shell';
import {EmailRequestForm} from '../login/forms';
import {passwordReady} from '../../lib/password-settings';
import {getChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function CreateAccount(){const user=await getChatGPTUser();return <AuthShell><EmailRequestForm mode="create" ready={passwordReady(process.env)} siteKey={process.env.TURNSTILE_SITE_KEY||null} email={user?.email} name={user?.fullName||''}/></AuthShell>;}
