import { ApiError, database } from './api';
import { ensureAccount } from './accounts';
import { audit } from './security';
import { allocateCentavos, toCentavos, summarizeFinance } from './finance';
import type { ChatGPTUser } from '../app/chatgpt-auth';
import type { BookingRow } from './booking';
import type { Quote } from './catalog';

export type FinancialBooking = BookingRow & {
  client_id?: string | null; booking_reference_code?: string | null; pickup_datetime?: string | null; return_datetime?: string | null;
  total_rental_fee_centavos?: number | null; security_deposit_centavos?: number | null; required_reservation_centavos?: number | null;
  late_penalty_centavos?: number; damage_deduction_centavos?: number; financial_version?: number; last_financial_operation?: string | null;
  is_demo?: number; destination_or_event?: string | null; lifecycle_status?: string; returned_at?: string | null;
};
type LedgerRow = { equipment_id: string | null; transaction_type: string; amount_centavos: number; is_net_revenue: number; escrow_effect_centavos: number; cash_effect_centavos: number };
export {summarizeFinance} from './finance';
export type FinancialState = ReturnType<typeof summarizeFinance>;
export async function financialState(booking: FinancialBooking) {
  const rows = await database().prepare('SELECT equipment_id,transaction_type,amount_centavos,is_net_revenue,escrow_effect_centavos,cash_effect_centavos FROM financial_transactions WHERE booking_id=? AND is_demo=?').bind(booking.id, booking.is_demo ?? 0).all<LedgerRow>();
  return summarizeFinance(booking, rows.results);
}
export async function financialStates(bookings: FinancialBooking[]) {
  const grouped = new Map<string, LedgerRow[]>();
  for (let offset = 0; offset < bookings.length; offset += 50) {
    const chunk = bookings.slice(offset, offset + 50);
    const rows = await database().prepare(`SELECT booking_id,equipment_id,transaction_type,amount_centavos,is_net_revenue,escrow_effect_centavos,cash_effect_centavos FROM financial_transactions WHERE booking_id IN (${chunk.map(() => '?').join(',')}) AND is_demo=0`).bind(...chunk.map(b => b.id)).all<LedgerRow & { booking_id: string }>();
    for (const row of rows.results) grouped.set(row.booking_id, [...(grouped.get(row.booking_id) ?? []), row]);
  }
  return new Map(bookings.map(b => [b.id, summarizeFinance(b, grouped.get(b.id) ?? [])]));
}
type Item = { equipment_id: string; rental_centavos: number; deposit_centavos: number };
type Entry = { equipmentId: string | null; type: string; amount: number; revenue: boolean; escrow: number; cash: number };
export async function ensureBookingItems(booking: FinancialBooking) {
  const db = database(), found = await db.prepare('SELECT equipment_id,rental_centavos,deposit_centavos FROM booking_items WHERE booking_id=? ORDER BY equipment_id').bind(booking.id).all<Item>();
  if (found.results.length) return found.results;
  const q = JSON.parse(booking.quote) as Quote, amounts = allocateCentavos(Math.round((q.totalMax ?? 0) * 100), q.lines.map(l => Math.round(((l.dailyMax ?? 0) * q.days + l.addonMax) * 100)));
  await db.batch(q.lines.map((l, i) => db.prepare('INSERT INTO booking_items(id,booking_id,equipment_id,package_name,rental_centavos,deposit_centavos) VALUES (?,?,?,?,?,?) ON CONFLICT(booking_id,equipment_id) DO NOTHING').bind(crypto.randomUUID(), booking.id, l.equipmentId, l.variant, amounts[i], l.depositMax * 100)));
  return q.lines.map((l, i) => ({ equipment_id: l.equipmentId, rental_centavos: amounts[i], deposit_centavos: l.depositMax * 100 }));
}
async function clientId(booking: FinancialBooking) {
  if (booking.client_id) return booking.client_id;
  const row = await database().prepare('SELECT id FROM users WHERE auth_user_id=?').bind(booking.user_id).first<{ id: string }>();
  if (!row) throw new ApiError(409, 'The client must sign in and register their account before payments are recorded.');
  await database().prepare('UPDATE bookings SET client_id=? WHERE id=? AND client_id IS NULL').bind(row.id, booking.id).run();
  return row.id;
}
function addAllocated(entries: Entry[], items: Item[], amount: number, weights: number[], type: string, revenue: boolean, escrowDirection = 0, cashDirection = 1) {
  if (!amount) return;
  const amounts = allocateCentavos(amount, weights);
  items.forEach((item, i) => { if (amounts[i]) entries.push({ equipmentId: item.equipment_id, type, amount: amounts[i], revenue, escrow: amounts[i] * escrowDirection, cash: amounts[i] * cashDirection }); });
}
async function commitOperation(request: Request, actor: ChatGPTUser, booking: FinancialBooking, input: {
  requestKey: string; kind: string; amount: number; method: string; reference: string; remarks: string; receiptId?: string | null;
  entries: Entry[]; update?: { sql: string; values: (string | number | null)[] };
  reversesPaymentId?: string; releaseUnits?: boolean;
}) {
  const db = database(), administrator = await ensureAccount(actor), client = await clientId(booking);
  if (!/^[\da-f-]{36}$/i.test(input.requestKey)) throw new ApiError(400, 'Refresh the payment form and try again.');
  const previous = await db.prepare('SELECT id,booking_id FROM payments WHERE recorded_by_admin_id=? AND request_key=?').bind(administrator.id, input.requestKey).first<{ id: string; booking_id: string }>();
  if (previous) { if (previous.booking_id !== booking.id) throw new ApiError(409, 'This request key belongs to another booking.'); return { id: previous.id, duplicate: true }; }
  if (input.receiptId) {
    const receipt = await db.prepare('SELECT id FROM payment_receipts WHERE id=? AND booking_id=?').bind(input.receiptId, booking.id).first();
    if (!receipt) throw new ApiError(400, 'Select a receipt belonging to this booking.');
  }
  const id = crypto.randomUUID(), operation = crypto.randomUUID(), now = new Date().toISOString();
  const identity = input.method !== 'CASH' && input.method !== 'INTERNAL' ? `${input.method}:${input.reference.toUpperCase().replace(/\s/g, '')}` : null;
  const statements = [
    db.prepare('UPDATE bookings SET financial_version=financial_version+1,last_financial_operation=? WHERE id=? AND financial_version=? AND status=?').bind(operation, booking.id, booking.financial_version ?? 0, booking.status),
    db.prepare('INSERT INTO payments(id,booking_id,client_id,recorded_by_admin_id,request_key,payment_identity,kind,amount_centavos,payment_method,payment_reference_number,receipt_id,remarks,is_demo,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM bookings WHERE id=? AND last_financial_operation=?)')
      .bind(id, booking.id, client, administrator.id, input.requestKey, identity, input.kind, input.amount, input.method, input.reference || null, input.receiptId || null, input.remarks, booking.is_demo ?? 0, now, booking.id, operation),
    ...input.entries.map((entry, i) => db.prepare('INSERT INTO financial_transactions(id,payment_id,booking_id,client_id,recorded_by_admin_id,equipment_id,transaction_type,amount_centavos,is_net_revenue,escrow_effect_centavos,cash_effect_centavos,line_index,is_demo,remarks,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM payments WHERE id=?)')
      .bind(crypto.randomUUID(), id, booking.id, client, administrator.id, entry.equipmentId, entry.type, entry.amount, Number(entry.revenue), entry.escrow, entry.cash, i, booking.is_demo ?? 0, input.remarks, now, id)),
    db.prepare('UPDATE bookings SET paid_total=(SELECT COALESCE(SUM(cash_effect_centavos),0)/100.0 FROM financial_transactions WHERE booking_id=?),updated_at=? WHERE id=? AND last_financial_operation=?').bind(booking.id, now, booking.id, operation),
  ];
  if (input.update) statements.push(db.prepare(input.update.sql + ' AND last_financial_operation=?').bind(...input.update.values, operation));
  if (input.reversesPaymentId) statements.push(db.prepare('INSERT INTO payment_reversals(original_payment_id,reversal_payment_id,created_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM payments WHERE id=?)').bind(input.reversesPaymentId, id, now, id));
  if (input.releaseUnits) {
    statements.push(db.prepare('DELETE FROM unit_reservations WHERE booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND last_financial_operation=?)').bind(booking.id, booking.id, operation));
    statements.push(db.prepare('DELETE FROM booking_days WHERE booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND last_financial_operation=?)').bind(booking.id, booking.id, operation));
  }
  await audit(request, actor.userId, booking.id, `finance.${input.kind.toLowerCase()}.attempt`);
  try {
    const results = await db.batch(statements);
    if (!results[0].meta.changes) throw new ApiError(409, 'The financial record changed. Refresh the booking before retrying.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (String(error).includes('UNIQUE')) throw new ApiError(409, 'This payment reference or request was already recorded. Refresh before retrying.');
    throw error;
  }
  await audit(request, actor.userId, booking.id, `finance.${input.kind.toLowerCase()}.recorded:${id}`);
  return { id, duplicate: false };
}
export async function recordPayment(request: Request, actor: ChatGPTUser, booking: FinancialBooking, value: Record<string, unknown>) {
  const kind = String(value.kind), method = String(value.paymentMethod), reference = typeof value.reference === 'string' ? value.reference.trim() : '';
  if (!['GCASH', 'MAYA', 'BANK_TRANSFER', 'CASH'].includes(method) || (method !== 'CASH' && !/^[A-Za-z0-9 _./-]{3,100}$/.test(reference))) throw new ApiError(400, 'Select a payment method and provide its transaction reference.');
  if (typeof value.remarks !== 'string' || value.remarks.length > 500 || value.confirmed !== true) throw new ApiError(400, 'Confirm that the payment or refund has actually been completed.');
  let amount; try { amount = toCentavos(value.amountPhp); } catch (error) { throw new ApiError(400, (error as Error).message); }
  const state = await financialState(booking), items = await ensureBookingItems(booking), entries: Entry[] = [];
  const rentalWeights = items.map(i => i.rental_centavos), depositWeights = items.map(i => i.deposit_centavos);
  if (kind === 'RESERVATION') {
    if (booking.status !== 'requested' || amount !== state.reservationDueCentavos) throw new ApiError(409, 'Record the exact outstanding reservation downpayment for a pending booking.');
    const rental = Math.min(amount, state.rentalBalanceCentavos), excess = amount - rental;
    addAllocated(entries, items, rental, rentalWeights, 'RESERVATION_DOWNPAYMENT', true);
    addAllocated(entries, items, excess, depositWeights, 'SECURITY_DEPOSIT_COLLECTED', false, 1);
  } else if (kind === 'RENTAL_BALANCE') {
    if (['requested', 'cancelled', 'cleared', 'returned'].includes(booking.status) || amount > state.rentalBalanceCentavos) throw new ApiError(409, 'This rental balance payment exceeds the outstanding amount or is unavailable at this stage.');
    addAllocated(entries, items, amount, rentalWeights, 'TURNOVER_BALANCE_PAYMENT', true);
  } else if (kind === 'SECURITY_DEPOSIT') {
    if (['requested', 'cancelled', 'cleared', 'returned'].includes(booking.status) || amount > state.depositDueCentavos) throw new ApiError(409, 'This deposit collection exceeds the remaining required deposit.');
    addAllocated(entries, items, amount, depositWeights, 'SECURITY_DEPOSIT_COLLECTED', false, 1);
  } else if (kind === 'DEPOSIT_REFUND') {
    if (!['cleared', 'returned', 'cancelled'].includes(booking.status) || amount > state.escrowHeldCentavos) throw new ApiError(409, 'The refund exceeds the refundable deposit held or the return is not cleared.');
    addAllocated(entries, items, amount, depositWeights, 'SECURITY_DEPOSIT_REFUNDED', false, -1, -1);
  } else if (kind === 'LATE_FEE' || kind === 'DAMAGE_COMPENSATION') {
    const due = kind === 'LATE_FEE' ? state.lateDueCentavos : state.damageDueCentavos;
    if (amount > due) throw new ApiError(409, 'The payment exceeds the assessed unpaid charge.');
    addAllocated(entries, items, amount, rentalWeights, kind === 'LATE_FEE' ? 'LATE_RETURN_PENALTY' : 'DAMAGE_OR_LOSS_COMPENSATION', kind === 'LATE_FEE');
  } else throw new ApiError(400, 'Select a supported payment type.');
  return commitOperation(request, actor, booking, { requestKey: String(value.requestKey), kind, amount, method, reference, remarks: value.remarks, receiptId: typeof value.receiptId === 'string' ? value.receiptId : null, entries });
}
export async function classifyForfeiture(request: Request, actor: ChatGPTUser, booking: FinancialBooking, requestKey: string) {
  if (await database().prepare('SELECT id FROM financial_transactions WHERE booking_id=? AND transaction_type=\'FORFEITED_DOWNPAYMENT\' LIMIT 1').bind(booking.id).first()) return { id: booking.id, duplicate: true };
  const rows = await database().prepare('SELECT equipment_id,SUM(amount_centavos) AS amount FROM financial_transactions WHERE booking_id=? AND transaction_type=\'RESERVATION_DOWNPAYMENT\' GROUP BY equipment_id').bind(booking.id).all<{ equipment_id: string; amount: number }>();
  const entries: Entry[] = rows.results.flatMap(row => [
    { equipmentId: row.equipment_id, type: 'RESERVATION_RECLASSIFICATION', amount: -row.amount, revenue: true, escrow: 0, cash: 0 },
    { equipmentId: row.equipment_id, type: 'FORFEITED_DOWNPAYMENT', amount: row.amount, revenue: true, escrow: 0, cash: 0 },
  ]);
  return commitOperation(request, actor, booking, { requestKey, kind: 'FORFEITURE_CLASSIFICATION', amount: 0, method: 'INTERNAL', reference: '', remarks: 'Reservation income reclassified after cancellation; no duplicate revenue or cash receipt.', entries });
}
export async function reversePayment(request: Request, actor: ChatGPTUser, originalId: string, reason: string, requestKey: string) {
  const db = database();
  const original = await db.prepare('SELECT * FROM payments WHERE id=?').bind(originalId).first<{ id: string; booking_id: string; amount_centavos: number; kind: string }>();
  if (!original || original.kind === 'REVERSAL' || original.kind === 'RETURN_SETTLEMENT' || original.kind === 'FORFEITURE_CLASSIFICATION') throw new ApiError(409, 'This entry cannot be reversed through the payment form.');
  if (await db.prepare('SELECT original_payment_id FROM payment_reversals WHERE original_payment_id=?').bind(originalId).first()) throw new ApiError(409, 'This payment has already been reversed.');
  if (reason.trim().length < 5 || reason.length > 500) throw new ApiError(400, 'Explain why the original payment record is incorrect.');
  const booking = await db.prepare('SELECT * FROM bookings WHERE id=?').bind(original.booking_id).first<FinancialBooking>();
  if (!booking) throw new ApiError(404, 'Booking not found.');
  const rows = await db.prepare('SELECT equipment_id,transaction_type,amount_centavos,is_net_revenue,escrow_effect_centavos,cash_effect_centavos FROM financial_transactions WHERE payment_id=? ORDER BY line_index').bind(originalId).all<LedgerRow>();
  const state = await financialState(booking), escrowChange = -rows.results.reduce((n, r) => n + r.escrow_effect_centavos, 0);
  if (state.escrowHeldCentavos + escrowChange < 0) throw new ApiError(409, 'Reverse the related refund or deposit application first; escrow cannot become negative.');
  // A unique original-payment reference makes duplicate reversal attempts atomic.
  const result = await commitOperation(request, actor, booking, {
    requestKey, kind: 'REVERSAL', amount: -original.amount_centavos, method: 'INTERNAL', reference: '', remarks: `Reversal of ${originalId}: ${reason.trim()}`, reversesPaymentId: originalId,
    entries: rows.results.map(r => ({ equipmentId: r.equipment_id, type: r.transaction_type, amount: -r.amount_centavos, revenue: !!r.is_net_revenue, escrow: -r.escrow_effect_centavos, cash: -r.cash_effect_centavos })),
  });
  return result;
}
export async function applyReturnDeductions(request: Request, actor: ChatGPTUser, booking: FinancialBooking, late: number, damage: number, returnedAt: string, requestKey: string) {
  const state = await financialState(booking), items = await ensureBookingItems(booking), weights = items.map(i => i.deposit_centavos), entries: Entry[] = [];
  const lateApplied = Math.min(state.escrowHeldCentavos, Math.max(0, late - (booking.late_penalty_centavos ?? 0) + state.lateDueCentavos));
  const damageApplied = Math.min(Math.max(0, state.escrowHeldCentavos - lateApplied), Math.max(0, damage - (booking.damage_deduction_centavos ?? 0) + state.damageDueCentavos));
  addAllocated(entries, items, lateApplied + damageApplied, weights, 'SECURITY_DEPOSIT_APPLIED', false, -1, 0);
  addAllocated(entries, items, lateApplied, items.map(i => i.rental_centavos), 'LATE_RETURN_PENALTY', true, 0, 0);
  addAllocated(entries, items, damageApplied, items.map(i => i.rental_centavos), 'DAMAGE_OR_LOSS_COMPENSATION', false, 0, 0);
  const now = new Date().toISOString(), purge = new Date(Date.now() + 7 * 86400000).toISOString();
  const result = await commitOperation(request, actor, booking, {
    requestKey, kind: 'RETURN_SETTLEMENT', amount: 0, method: 'INTERNAL', reference: '', remarks: 'Return inspection cleared. Assessed charges applied against the refundable deposit; any excess remains receivable.', entries, releaseUnits: true,
    update: { sql: 'UPDATE bookings SET status=\'cleared\',lifecycle_status=\'CLEARED_AND_RETURNED\',late_penalty_centavos=?,damage_deduction_centavos=?,returned_at=?,cleared_at=?,purge_at=?,updated_at=? WHERE id=?', values: [late, damage, returnedAt, now, purge, now, booking.id] },
  });
  return result;
}
