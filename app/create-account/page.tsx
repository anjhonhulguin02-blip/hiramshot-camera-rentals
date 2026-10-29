import {env} from '@hiramshot/runtime';
import AuthShell from '../login/auth-shell';
import {EmailRequestForm} from '../login/forms';
import {passwordReady} from '../../lib/password-settings';
import {getChatGPTUser} from '../chatgpt-auth';
import {continueWithGoogle} from '../login/actions';
export const dynamic='force-dynamic';
export default async function CreateAccount(){const user=await getChatGPTUser();return <AuthShell><EmailRequestForm mode="create" ready={passwordReady(process.env,typeof env.AUTH_EMAIL?.send==='function')} siteKey={process.env.TURNSTILE_SITE_KEY||null} email={user?.email} name={user?.fullName||''} signedIn={!!user} googleReady={!!(process.env.AUTH_GOOGLE_ID&&process.env.AUTH_GOOGLE_SECRET&&process.env.AUTH_SECRET)} googleAction={continueWithGoogle}/></AuthShell>;}
