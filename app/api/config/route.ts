import { env } from 'cloudflare:workers';
import { json } from '../../../lib/api';
import { contactEmail } from '../../../lib/site';
import { kycReady } from '../../../lib/security';
export async function GET(){return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY||null,kycEnabled:kycReady(),receiptUploadsEnabled:!!(env.BUCKET&&env.MALWARE_SCANNER_URL&&env.MALWARE_SCANNER_TOKEN&&env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY),contactEmail:contactEmail(),retentionDays:7});}
