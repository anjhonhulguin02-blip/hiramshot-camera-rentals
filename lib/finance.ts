import type {Quote} from './catalog';
export type FinanceSnapshot={quote:string;total_rental_fee_centavos?:number|null;security_deposit_centavos?:number|null;required_reservation_centavos?:number|null;late_penalty_centavos?:number;damage_deduction_centavos?:number};
export type FinanceLedgerEntry={transaction_type:string;amount_centavos:number;is_net_revenue:number;escrow_effect_centavos:number;cash_effect_centavos:number};
export function toCentavos(value: unknown): number {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^\d{1,8}(\.\d{1,2})?$/.test(text)) throw new Error('Enter a positive PHP amount with at most two decimal places.');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100000000) throw new Error('The amount must be between PHP 0.01 and PHP 1,000,000.00.');
  return result;
}
export function php(cents: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100); }
export function allocateCentavos(total: number, weights: number[]) {
  if (!Number.isSafeInteger(total) || total < 0 || weights.some(v => !Number.isSafeInteger(v) || v < 0)) throw new Error('Invalid allocation.');
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) { if (total) throw new Error('Allocation requires a positive weight.'); return weights.map(() => 0); }
  const allocation = weights.map(w => Math.floor(total * w / sum));
  const order = weights.map((w, i) => ({ i, remainder: total * w % sum })).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  let remaining = total - allocation.reduce((a, b) => a + b, 0);
  for (const item of order) { if (!remaining) break; allocation[item.i]++; remaining--; }
  return allocation;
}
export function latePenaltyCentavos(returnedMs: number, cutoffMs: number, dailyRateCentavos: number) {
  const delay = Math.max(0, returnedMs - cutoffMs);
  if (!delay) return 0;
  return delay <= 4 * 3600000 ? Math.ceil(delay / 3600000) * 10000 : Math.ceil(delay / 86400000) * dailyRateCentavos;
}
export function rentalPeriod(pickup: string, returned: string, now = Date.now()) {
  const dateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
  if (!dateTime.test(pickup) || !dateTime.test(returned)) throw new Error('Choose valid pickup and return times, including their timezone.');
  for (const value of [pickup,returned]) {
    const [year,month,day,hour,minute,second]=value.match(/\d+/g)!.map(Number);
    if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour>23||minute>59||second>59) throw new Error('Choose a valid calendar date and time.');
  }
  const start = Date.parse(pickup), end = Date.parse(returned);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Return time must follow pickup time.');
  if (start < now) throw new Error('Pickup time must be in the future.');
  const days = Math.ceil((end - start) / 86400000);
  if (days < 1 || days > 30 || start - now > 365 * 86400000) throw new Error('Choose 1-30 rental days with pickup within the next year.');
  return { pickupMs: start, returnMs: end, days };
}
export function lifecycleStatus(status: string, returned: string | null, now = Date.now()) {
  if (status === 'out' && returned && Date.parse(returned) < now) return 'OVERDUE_ALERT';
  return ({ requested: 'PENDING_KYC_REVIEW', reserved: 'CONFIRMED_RESERVED', verification: 'PENDING_KYC_REVIEW', verified: 'PENDING_DOWNPAYMENT', signed: 'CONFIRMED_RESERVED', out: 'ACTIVE_TURNED_OVER', cleared: 'CLEARED_AND_RETURNED', returned: 'CLEARED_AND_RETURNED', cancelled: 'CANCELLED_FORFEITED' } as Record<string, string>)[status] ?? 'PENDING_DOWNPAYMENT';
}
export function csvCell(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function summarizeFinance(booking: FinanceSnapshot, ledger: FinanceLedgerEntry[]) {
  const q = JSON.parse(booking.quote) as Quote;
  const rentalTotal = booking.total_rental_fee_centavos ?? Math.round((q.totalMax ?? 0) * 100);
  const depositTotal = booking.security_deposit_centavos ?? q.depositMax * 100;
  const reservationRequired = booking.required_reservation_centavos ?? (q.reservationMax ?? 0) * 100;
  const sum = (types: string[]) => ledger.filter(l => types.includes(l.transaction_type)).reduce((n, l) => n + l.amount_centavos, 0);
  const rentalCollected = sum(['RESERVATION_DOWNPAYMENT', 'TURNOVER_BALANCE_PAYMENT', 'RESERVATION_RECLASSIFICATION', 'FORFEITED_DOWNPAYMENT']);
  const reservationCollected = sum(['RESERVATION_DOWNPAYMENT']) + Math.min(depositTotal, Math.max(0, reservationRequired - rentalTotal), sum(['SECURITY_DEPOSIT_COLLECTED']));
  const depositCollected = sum(['SECURITY_DEPOSIT_COLLECTED']);
  const escrowHeld = ledger.reduce((n, l) => n + l.escrow_effect_centavos, 0);
  const lateCollected = sum(['LATE_RETURN_PENALTY']), damageCollected = sum(['DAMAGE_OR_LOSS_COMPENSATION']);
  return {
    rentalTotalCentavos: rentalTotal, depositTotalCentavos: depositTotal, reservationRequiredCentavos: reservationRequired,
    rentalCollectedCentavos: rentalCollected, reservationCollectedCentavos: reservationCollected, depositCollectedCentavos: depositCollected,
    escrowHeldCentavos: escrowHeld, depositRefundedCentavos: sum(['SECURITY_DEPOSIT_REFUNDED']),
    rentalBalanceCentavos: Math.max(0, rentalTotal - rentalCollected), depositDueCentavos: Math.max(0, depositTotal - depositCollected),
    reservationDueCentavos: Math.max(0, reservationRequired - reservationCollected),
    lateDueCentavos: Math.max(0, (booking.late_penalty_centavos ?? 0) - lateCollected),
    damageDueCentavos: Math.max(0, (booking.damage_deduction_centavos ?? 0) - damageCollected),
    netRentalCollectionsCentavos: ledger.filter(l => l.is_net_revenue).reduce((n, l) => n + l.amount_centavos, 0),
    cashMovementCentavos: ledger.reduce((n, l) => n + l.cash_effect_centavos, 0),
  };
}
