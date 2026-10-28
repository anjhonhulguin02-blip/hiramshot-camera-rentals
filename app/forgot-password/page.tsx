import AuthShell from '../login/auth-shell';
import {EmailRequestForm} from '../login/forms';
import {passwordReady} from '../../lib/password-settings';
export const dynamic='force-dynamic';
export default function ForgotPassword(){return <AuthShell><EmailRequestForm mode="reset" ready={passwordReady(process.env)} siteKey={process.env.TURNSTILE_SITE_KEY||null}/></AuthShell>;}
