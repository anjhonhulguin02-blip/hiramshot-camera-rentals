import { env,uploadMaxBytes } from '@hiramshot/runtime';
import { json } from '../../../lib/api';
import { contactEmail } from '../../../lib/site';
import { kycReady } from '../../../lib/security';
import {scannerConfigured} from '../../../lib/malware-scanner';
import {paymentQrSettings} from '../../../lib/payment-qr';
import {passwordReady} from '../../../lib/password-settings';
export async function GET(){return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY||null,kycEnabled:kycReady(),paymentQrEnabled:!!env.BUCKET&&!!paymentQrSettings(env.PAYMENT_QR_SETTINGS),emailSignInEnabled:passwordReady(env as unknown as Record<string,string|undefined>,typeof env.AUTH_EMAIL?.send==='function'),receiptUploadsEnabled:!!(env.BUCKET&&scannerConfigured(env)&&env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY),contactEmail:contactEmail(),retentionDays:7,uploadMaxBytes});}
