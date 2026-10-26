import { assertSameOrigin, database, failure, json, readBody, ApiError } from '../../../../lib/api';
import { requireAdmin, audit } from '../../../../lib/security';
import { getBooking } from '../../../../lib/booking';
import { recordPayment, reversePayment, classifyForfeiture } from '../../../../lib/ledger';
export async function GET(request: Request) {
  try {
    const user = await requireAdmin(request), bookingId = new URL(request.url).searchParams.get('booking');
    if (!bookingId) throw new ApiError(400, 'Select a booking.');
    await getBooking(bookingId, user.userId, true);
    const rows = await database().prepare('SELECT p.*,u.full_name AS recorded_by_name,(SELECT reversal_payment_id FROM payment_reversals WHERE original_payment_id=p.id) AS reversal_payment_id FROM payments p JOIN users u ON u.id=p.recorded_by_admin_id WHERE p.booking_id=? AND p.is_demo=0 ORDER BY p.created_at DESC LIMIT 100').bind(bookingId).all();
    await audit(request, user.userId, bookingId, 'finance.payments.view');
    return json({ payments: rows.results });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); const user = await requireAdmin(request), input = await readBody(request);
    if (input?.action === 'reverse') return json(await reversePayment(request, user, String(input.paymentId), String(input.reason ?? ''), String(input.requestKey)));
    const booking = await getBooking(String(input?.bookingId), user.userId, true);
    if (input?.action === 'classify-forfeiture') {
      if (booking.status !== 'cancelled') throw new ApiError(409, 'Only cancelled bookings can have forfeited downpayments classified.');
      return json(await classifyForfeiture(request, user, booking, String(input.requestKey)));
    }
    return json(await recordPayment(request, user, booking, input));
  } catch (error) { return failure(error); }
}
