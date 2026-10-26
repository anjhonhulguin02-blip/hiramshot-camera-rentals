import { env } from 'cloudflare:workers';
import { database, failure, identity, ApiError } from '../../../../lib/api';
import { getBooking } from '../../../../lib/booking';
import { requireStaff, audit } from '../../../../lib/security';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = new URL(request.url).searchParams.get('admin') === '1', user = admin ? await requireStaff(request) : await identity(), { id } = await context.params;
    const receipt = await database().prepare('SELECT * FROM payment_receipts WHERE id=?').bind(id).first<{ booking_id: string; object_key: string; mime: string }>();
    if (!receipt || !env.BUCKET) throw new ApiError(404, 'Receipt not found.');
    await getBooking(receipt.booking_id, user.userId, admin); await audit(request, user.userId, receipt.booking_id, `payment.receipt.download:${id}`);
    const object = await env.BUCKET.get(receipt.object_key); if (!object) throw new ApiError(404, 'Receipt file not found.');
    return new Response(object.body, { headers: { 'Content-Type': receipt.mime, 'Content-Disposition': `attachment; filename="HiramShot-Receipt-${id}.${receipt.mime === 'application/pdf' ? 'pdf' : receipt.mime.split('/')[1]}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return failure(error); }
}
