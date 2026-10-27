import {FILE_UPLOAD_LIMIT} from '../../../../../lib/request-limits';
import { env } from 'cloudflare:workers';
import { database, failure, identity, json, ApiError } from '../../../../../lib/api';
import { ensureAccount } from '../../../../../lib/accounts';
import { getBooking } from '../../../../../lib/booking';
import { applyRequestLimit, audit, verifyTurnstile } from '../../../../../lib/security';
import { boundedBytes, MAX_FILE, sanitizeUpload } from '../../../../../lib/upload';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Upload receipts from this website.');
    const user = await identity(), account = await ensureAccount(user), { id } = await context.params;
    await getBooking(id, user.userId);
    if (!env.BUCKET || !env.MALWARE_SCANNER_URL || !env.MALWARE_SCANNER_TOKEN) throw new ApiError(503, 'Private payment receipt uploads are awaiting security configuration.');
    await applyRequestLimit(request,user.userId,FILE_UPLOAD_LIMIT);
    let bytes; try { bytes = await boundedBytes(request, MAX_FILE + 32768); } catch (error) { throw new ApiError(413, (error as Error).message); }
    const body = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body: bytes as BodyInit }).formData(), file = body.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'Choose a payment receipt.');
    await verifyTurnstile(request, body.get('turnstileToken'), 'receipt');
    let safe; try { safe = sanitizeUpload(file.name, file.type, new Uint8Array(await file.arrayBuffer())); } catch (error) { throw new ApiError(400, (error as Error).message); }
    const scanner = new URL(env.MALWARE_SCANNER_URL); if (scanner.protocol !== 'https:') throw new ApiError(503, 'A secure document scanner is required.');
    const scanResponse = await fetch(scanner, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${env.MALWARE_SCANNER_TOKEN}` }, body: safe.bytes as BodyInit, signal: AbortSignal.timeout(20000) });
    const scan = await scanResponse.json() as { clean?: boolean }; if (!scanResponse.ok || scan.clean !== true) throw new ApiError(400, 'The receipt did not pass the security scan.');
    const receiptId = crypto.randomUUID(), key = `receipts/${crypto.randomUUID()}`; await audit(request, user.userId, id, `payment.receipt.upload:${receiptId}`);
    await env.BUCKET.put(key, safe.bytes, { httpMetadata: { contentType: safe.mime } });
    try { await database().prepare('INSERT INTO payment_receipts(id,booking_id,uploaded_by,object_key,mime,size,created_at) VALUES (?,?,?,?,?,?,?)').bind(receiptId, id, account.id, key, safe.mime, safe.bytes.length, new Date().toISOString()).run(); }
    catch (error) { await env.BUCKET.delete(key); throw error; }
    return json({ id: receiptId }, 201);
  } catch (error) { return failure(error); }
}
