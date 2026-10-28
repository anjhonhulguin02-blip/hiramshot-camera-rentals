import { env,uploadMaxBytes } from '@hiramshot/runtime';
import { json } from '../../../lib/api';
import { contactEmail } from '../../../lib/site';
import { kycReady } from '../../../lib/security';
import {scannerConfigured} from '../../../lib/malware-scanner';
export async function GET(){return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY||null,kycEnabled:kycReady(),receiptUploadsEnabled:!!(env.BUCKET&&scannerConfigured(env)&&env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY),contactEmail:contactEmail(),retentionDays:7,uploadMaxBytes});}
