import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import { siteUrl,allowedOrigins,indexable } from '../lib/site';
import { purgeExpired } from '../lib/purge';

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url), canonical = new URL(siteUrl());
    if (!import.meta.env.DEV && env.CUSTOM_DOMAIN && url.origin !== canonical.origin && allowedOrigins().includes(url.origin)) {
      return Response.redirect(new URL(url.pathname + url.search, canonical).toString(), 308);
    }
    const origin = request.headers.get('Origin'), allowed = allowedOrigins();
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      if (!origin || !allowed.includes(origin)) return new Response(null, {status:403});
      return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Credentials':'true','Vary':'Origin'}});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    const secure = new Response(response.body, response);
    if (origin && allowed.includes(origin)) { secure.headers.set('Access-Control-Allow-Origin',origin); secure.headers.set('Access-Control-Allow-Credentials','true'); secure.headers.append('Vary','Origin'); }
    if (!indexable() || /^\/(?:account|admin|api|book|login|signup|requests)(?:\/|$)/.test(url.pathname)) secure.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    secure.headers.set('X-Content-Type-Options','nosniff');
    secure.headers.set('X-Frame-Options','DENY');
    secure.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
    secure.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
    secure.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    if (!import.meta.env.DEV) secure.headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    if (secure.headers.get('Content-Type')?.includes('text/html') || new URL(request.url).pathname.startsWith('/api/')) secure.headers.set('Cache-Control','private, no-store');
    return secure;
  },
  async scheduled(_event: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) { ctx.waitUntil(purgeExpired(env)); },
};

export default worker;
