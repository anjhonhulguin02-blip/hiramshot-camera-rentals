import { env } from '@hiramshot/runtime';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { ensureAccount,RegistrationRequiredError } from './accounts';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' } }); }
export async function identity() { const user = await getChatGPTUser(); if (!user) throw new ApiError(401, 'Sign in to continue.'); const account = await ensureAccount(user); if (account.account_status !== 'ACTIVE') throw new ApiError(403, 'Your account is restricted. Contact HiramShot for assistance.'); return user; }
export function database() { if (!env.DB) throw new ApiError(503, 'Requests are temporarily unavailable. Please try again later.'); return env.DB; }
export function assertSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Please submit from this website.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'JSON is required.');
}
export async function readBody(request: Request) {
  if (Number(request.headers.get('content-length')) > 8192) throw new ApiError(413, 'Request is too large.');
  const reader = request.body?.getReader(); if (!reader) throw new ApiError(400, 'Request body is required.');
  const chunks: Uint8Array[] = []; let total = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 8192) { await reader.cancel(); throw new ApiError(413, 'Request is too large.'); } chunks.push(value); }
  const joined = new Uint8Array(total); let offset = 0; for (const c of chunks) { joined.set(c, offset); offset += c.length; }
  try { return JSON.parse(new TextDecoder().decode(joined)); } catch { throw new ApiError(400, 'Invalid JSON.'); }
}
export function failure(error: unknown) { if(error instanceof RegistrationRequiredError)return json({error:error.message,registrationRequired:true},403); if (error instanceof ApiError) return json({ error: error.message }, error.status); console.error('Request operation failed', error instanceof Error ? error.name : 'unknown'); return json({ error: 'Something went wrong. Please try again.' }, 500); }
