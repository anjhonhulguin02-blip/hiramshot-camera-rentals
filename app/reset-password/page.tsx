import {env} from '@hiramshot/runtime';
import AuthShell from '../login/auth-shell';
import {PasswordCompletionForm} from '../login/forms';
import {passwordReady} from '../../lib/password-settings';
export const dynamic='force-dynamic';
export default function ResetPassword(){return <AuthShell><PasswordCompletionForm purpose="reset" ready={passwordReady(process.env,typeof env.AUTH_EMAIL?.send==='function')} siteKey={process.env.TURNSTILE_SITE_KEY||null}/></AuthShell>;}
