import { database, failure, ApiError } from '../../../../lib/api';
import { requireAdmin, audit } from '../../../../lib/security';
import { csvCell } from '../../../../lib/finance';
import { revenueReportPdf, type ReportRow } from '../../../../lib/report-pdf';
export async function GET(request: Request) {
  try {
    const user = await requireAdmin(request), params = new URL(request.url).searchParams, format = params.get('format') || 'csv', month = params.get('month');
    if (!['csv', 'pdf'].includes(format) || (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))) throw new ApiError(400, 'Choose CSV or PDF and a valid reporting month.');
    const limit = format === 'pdf' ? 500 : 10000;
    const query = 'SELECT l.*,p.payment_method,p.payment_reference_number,b.booking_reference_code FROM financial_transactions l JOIN payments p ON p.id=l.payment_id JOIN bookings b ON b.id=l.booking_id WHERE l.is_demo=0' + (month ? ' AND strftime(\'%Y-%m\',l.created_at,\'+8 hours\')=?' : '') + ' ORDER BY l.created_at,l.id LIMIT ?';
    const rows = await database().prepare(query).bind(...(month ? [month, limit + 1] : [limit + 1])).all<ReportRow & Record<string, unknown>>();
    if (rows.results.length > limit) throw new ApiError(413, `Choose a narrower reporting month. This ${format.toUpperCase()} export supports ${limit.toLocaleString()} entries.`);
    await audit(request, user.userId, '', `finance.export.${format}:${month || 'all-time'}`);
    const headers = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `attachment; filename="HiramShot-Ledger-${month || 'all-time'}.${format}"` };
    if (format === 'pdf') return new Response(await revenueReportPdf(rows.results, month || 'All time', new Date().toISOString()) as BodyInit, { headers: { ...headers, 'Content-Type': 'application/pdf' } });
    const columns = ['id', 'booking_reference_code', 'client_id', 'recorded_by_admin_id', 'transaction_type', 'amount_php', 'is_net_revenue', 'escrow_effect_php', 'cash_effect_php', 'payment_method', 'payment_reference_number', 'created_at', 'remarks'];
    const csv = [columns.map(csvCell).join(','), ...rows.results.map(row => columns.map(key => csvCell(key === 'amount_php' ? row.amount_centavos / 100 : key === 'escrow_effect_php' ? Number(row.escrow_effect_centavos) / 100 : key === 'cash_effect_php' ? Number(row.cash_effect_centavos) / 100 : row[key])).join(','))].join('\r\n');
    return new Response('\ufeff' + csv, { headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' } });
  } catch (error) { return failure(error); }
}
