import { database, failure, json, ApiError } from '../../../../lib/api';
import { audit, requireAdmin } from '../../../../lib/security';
export async function GET(request: Request) {
  try {
    const user = await requireAdmin(request), month = new URL(request.url).searchParams.get('month') || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit' }).format(new Date());
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, 'Choose a valid reporting month.');
    const db = database();
    const [totals, equipment, daily, receivables, overdue] = await db.batch([
      db.prepare('SELECT COALESCE(SUM(CASE WHEN is_net_revenue=1 THEN amount_centavos ELSE 0 END),0) AS total_revenue,COALESCE(SUM(CASE WHEN is_net_revenue=1 AND strftime(\'%Y-%m\',created_at,\'+8 hours\')=? THEN amount_centavos ELSE 0 END),0) AS monthly_revenue,COALESCE(SUM(escrow_effect_centavos),0) AS escrow_held,COALESCE(SUM(CASE WHEN transaction_type=\'DAMAGE_OR_LOSS_COMPENSATION\' THEN amount_centavos ELSE 0 END),0) AS damage_recoveries,COALESCE(SUM(cash_effect_centavos),0) AS net_cash FROM financial_transactions WHERE is_demo=0').bind(month),
      db.prepare('SELECT l.equipment_id,COALESCE(json_extract(e.config,\'$.name\'),l.equipment_id) AS name,SUM(CASE WHEN l.is_net_revenue=1 THEN l.amount_centavos ELSE 0 END) AS revenue FROM financial_transactions l LEFT JOIN equipment e ON e.id=l.equipment_id WHERE l.is_demo=0 GROUP BY l.equipment_id ORDER BY revenue DESC'),
      db.prepare('SELECT strftime(\'%Y-%m-%d\',created_at,\'+8 hours\') AS day,SUM(CASE WHEN is_net_revenue=1 THEN amount_centavos ELSE 0 END) AS revenue FROM financial_transactions WHERE is_demo=0 AND strftime(\'%Y-%m\',created_at,\'+8 hours\')=? GROUP BY day ORDER BY day').bind(month),
      db.prepare('SELECT COALESCE(SUM(MAX(0,COALESCE(b.total_rental_fee_centavos,CAST(json_extract(b.quote,\'$.totalMax\')*100 AS INTEGER))-COALESCE(p.rental_paid,0))),0) AS pending FROM bookings b LEFT JOIN (SELECT booking_id,SUM(CASE WHEN transaction_type IN (\'RESERVATION_DOWNPAYMENT\',\'TURNOVER_BALANCE_PAYMENT\',\'RESERVATION_RECLASSIFICATION\',\'FORFEITED_DOWNPAYMENT\') THEN amount_centavos ELSE 0 END) AS rental_paid FROM financial_transactions WHERE is_demo=0 GROUP BY booking_id) p ON p.booking_id=b.id WHERE b.is_demo=0 AND b.status NOT IN (\'cancelled\',\'cleared\',\'returned\')'),
      db.prepare('SELECT COUNT(*) AS count FROM bookings WHERE is_demo=0 AND status=\'out\' AND julianday(COALESCE(return_datetime,end_date||\'T09:00:00+08:00\'))<julianday(?)').bind(new Date().toISOString()),
    ]);
    await audit(request, user.userId, '', 'finance.dashboard.view');
    return json({ month, totals: { ...(totals.results[0] as Record<string, number>), pending_receivables: (receivables.results[0] as { pending: number })?.pending ?? 0, overdue_count: (overdue.results[0] as { count: number })?.count ?? 0 }, equipment: equipment.results, daily: daily.results, updatedAt: new Date().toISOString() });
  } catch (error) { return failure(error); }
}
