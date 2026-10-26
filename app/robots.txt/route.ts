import { indexable, siteUrl } from '../../lib/site';
export function GET() {
 const text = indexable() ? `User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /admin\nDisallow: /api/\nDisallow: /book\nDisallow: /login\nDisallow: /signup\nDisallow: /requests\nSitemap: ${siteUrl('/sitemap.xml')}\n` : 'User-agent: *\nDisallow: /\n';
 return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
