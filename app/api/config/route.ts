import { env } from 'cloudflare:workers';
import { json } from '../../../lib/api';
import { kycReady } from '../../../lib/security';
export async function GET(){return json({turnstileSiteKey:env.TURNSTILE_SITE_KEY||null,kycEnabled:kycReady(),contactEmail:env.CONTACT_EMAIL||'hiramshotrentals@gmail.com',retentionDays:7});}
