import { env } from 'cloudflare:workers';
const DEFAULT_SITE_URL = 'https://hiramshot-camera-rentals.icycomet64.chatgpt.site';
export function siteUrl(path = '/') {
  const configured = env.APP_BASE_URL || env.NEXT_PUBLIC_SITE_URL || (env.CUSTOM_DOMAIN ? `https://${env.CUSTOM_DOMAIN}` : DEFAULT_SITE_URL);
  const base = new URL(configured);
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('APP_BASE_URL must be an HTTPS origin.');
  return new URL(path, base).toString();
}
export function contactEmail() { return env.ADMIN_CONTACT_EMAIL || env.CONTACT_EMAIL || 'hiramshotrentals@gmail.com'; }
export function indexable() { return env.PUBLIC_INDEXING_ENABLED === 'true'; }
export function allowedOrigins() { const origin = new URL(siteUrl()).origin, host = new URL(origin).hostname; return [origin, ...(env.CUSTOM_DOMAIN ? [`https://${host.startsWith('www.') ? host.slice(4) : 'www.' + host}`] : [])]; }
