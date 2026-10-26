import { database, failure, identity, json } from '../../../../lib/api';
export async function GET() {
  try {
    const user = await identity();
    const rows = await database().prepare('SELECT p.id,p.kind,p.amount_centavos,p.payment_method,p.payment_reference_number,p.created_at,b.booking_reference_code,b.id AS booking_id,(SELECT reversal_payment_id FROM payment_reversals WHERE original_payment_id=p.id) AS reversal_payment_id FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE b.user_id=? AND p.is_demo=0 AND p.kind NOT IN (\'RETURN_SETTLEMENT\',\'FORFEITURE_CLASSIFICATION\') ORDER BY p.created_at DESC LIMIT 200').bind(user.userId).all();
    return json({ payments: rows.results });
  } catch (error) { return failure(error); }
}
