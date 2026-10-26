import test from 'node:test';
import assert from 'node:assert/strict';
import { toCentavos, allocateCentavos, rentalPeriod, latePenaltyCentavos, summarizeFinance, csvCell, type FinanceLedgerEntry } from '../lib/finance';
import { INITIAL_CATALOG, calculateQuote } from '../lib/catalog';
import { revenueReportPdf } from '../lib/report-pdf';
import { PDFDocument } from 'pdf-lib';
import { mkdirSync, writeFileSync } from 'node:fs';
const quote = calculateQuote(INITIAL_CATALOG, [{ equipmentId: 'x5', variant: 'Standard', addons: [] }], 3);
const booking = { quote: JSON.stringify(quote) };
const line = (type: string, amount: number, revenue: boolean, escrow = 0, cash = amount): FinanceLedgerEntry => ({ transaction_type: type, amount_centavos: amount, is_net_revenue: Number(revenue), escrow_effect_centavos: escrow, cash_effect_centavos: cash });

test('PHP input and proportional allocation preserve every centavo', () => {
 assert.equal(toCentavos('1234.56'), 123456);
 for (const bad of ['0', '-1', '1.001', '1e3', 'NaN', '1000001', undefined]) assert.throws(() => toCentavos(bad));
 assert.deepEqual(allocateCentavos(100, [1, 1, 1]), [34, 33, 33]);
 for (let total = 1; total < 1000; total++) assert.equal(allocateCentavos(total, [165000, 210000, 370000]).reduce((a, b) => a + b, 0), total);
});
test('rental days use exact 24-hour intervals and reject invalid dates', () => {
 const now = Date.parse('2026-10-26T00:00:00Z');
 for (const [end, days] of [['2026-11-02T09:00:00+08:00', 1], ['2026-11-02T09:00:01+08:00', 2], ['2026-11-07T09:00:00+08:00', 6], ['2026-11-07T09:00:01+08:00', 7]] as const) assert.equal(rentalPeriod('2026-11-01T09:00:00+08:00', end, now).days, days);
 for (const start of ['2027-02-30T09:00:00+08:00', '2026-11-01T24:00:00+08:00', '2026-10-25T09:00:00+08:00', '2026-11-01T09:00:00']) assert.throws(() => rentalPeriod(start, '2027-03-02T09:00:00+08:00', now));
});
test('deposit collections and refunds never become rental earnings', () => {
 const lines = [line('RESERVATION_DOWNPAYMENT', 50000, true), line('TURNOVER_BALANCE_PAYMENT', 115000, true), line('SECURITY_DEPOSIT_COLLECTED', 200000, false, 200000)];
 let state = summarizeFinance(booking, lines); assert.equal(state.netRentalCollectionsCentavos, 165000); assert.equal(state.escrowHeldCentavos, 200000); assert.equal(state.rentalBalanceCentavos, 0);
 lines.push(line('SECURITY_DEPOSIT_REFUNDED', 200000, false, -200000, -200000)); state = summarizeFinance(booking, lines);
 assert.equal(state.netRentalCollectionsCentavos, 165000); assert.equal(state.escrowHeldCentavos, 0); assert.equal(state.depositRefundedCentavos, 200000);
});
test('forfeiture reclassification does not duplicate earnings or cash', () => {
 const state = summarizeFinance(booking, [line('RESERVATION_DOWNPAYMENT', 50000, true), line('RESERVATION_RECLASSIFICATION', -50000, true, 0, 0), line('FORFEITED_DOWNPAYMENT', 50000, true, 0, 0)]);
 assert.equal(state.netRentalCollectionsCentavos, 50000); assert.equal(state.cashMovementCentavos, 50000); assert.equal(state.rentalCollectedCentavos, 50000);
});
test('deposit deductions recognize late income and separate damage recovery', () => {
 const state = summarizeFinance({ ...booking, late_penalty_centavos: 20000, damage_deduction_centavos: 50000 }, [line('SECURITY_DEPOSIT_COLLECTED', 200000, false, 200000), line('SECURITY_DEPOSIT_APPLIED', 70000, false, -70000, 0), line('LATE_RETURN_PENALTY', 20000, true, 0, 0), line('DAMAGE_OR_LOSS_COMPENSATION', 50000, false, 0, 0)]);
 assert.equal(state.escrowHeldCentavos, 130000); assert.equal(state.netRentalCollectionsCentavos, 20000); assert.equal(state.lateDueCentavos + state.damageDueCentavos, 0);
});
test('minimum reservation excess credits the refundable deposit', () => {
 const q = { ...quote, totalMax: 350, depositMax: 1500, reservationMax: 500 };
 const state = summarizeFinance({ quote: JSON.stringify(q) }, [line('RESERVATION_DOWNPAYMENT', 35000, true), line('SECURITY_DEPOSIT_COLLECTED', 15000, false, 15000)]);
 assert.equal(state.reservationDueCentavos, 0); assert.equal(state.rentalBalanceCentavos, 0); assert.equal(state.depositDueCentavos, 135000); assert.equal(state.netRentalCollectionsCentavos, 35000);
});
test('late fees follow hour and full-day boundaries', () => {
 for (const [delay, expected] of [[0, 0], [1, 10000], [3600000, 10000], [3600001, 20000], [4 * 3600000, 40000], [4 * 3600000 + 1, 65000], [86400000 + 1, 130000]]) assert.equal(latePenaltyCentavos(delay, 0, 65000), expected);
});
test('CSV export escapes formulas while keeping signed numeric amounts', () => {
 assert.equal(csvCell(' =SUM(A1)'), '"\' =SUM(A1)"'); assert.equal(csvCell(-125.5), '-125.5'); assert.equal(csvCell('a"b'), '"a""b"');
});
test('financial report PDF paginates with original branding and totals', async () => {
 const rows = Array.from({ length: 35 }, (_, i) => ({ created_at: '2026-10-26T00:00:00.000Z', booking_reference_code: 'HSR-2026-ABCDEF123456', transaction_type: i % 2 ? 'SECURITY_DEPOSIT_COLLECTED' : 'RESERVATION_DOWNPAYMENT', amount_centavos: 50000, is_net_revenue: i % 2 ? 0 : 1, escrow_effect_centavos: i % 2 ? 50000 : 0, payment_method: 'BANK_TRANSFER' }));
 const bytes = await revenueReportPdf(rows, '2026-10 SYNTHETIC TEST', '2026-10-26T00:00:00.000Z'), pdf = await PDFDocument.load(bytes);
 assert.ok(pdf.getPageCount() >= 3); mkdirSync('outputs', { recursive: true }); writeFileSync('outputs/sample-revenue-ledger.pdf', bytes);
});
