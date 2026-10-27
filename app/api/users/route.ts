import { assertSameOrigin, database, failure, json, readBody, ApiError } from '../../../lib/api';
import { audit, requireAdmin } from '../../../lib/security';
import { ensureAccount, isConfiguredAdministrator, type AccountRow } from '../../../lib/accounts';
export async function GET(request: Request) {
  try {
    const administrator = await requireAdmin(request), params = new URL(request.url).searchParams, search = (params.get('search') || '').slice(0, 100), status = params.get('status'), role = params.get('role');
    const conditions = ['is_demo=0'], values: string[] = [];
    if (search) { conditions.push('(full_name LIKE ? ESCAPE \'\\\' OR email LIKE ? ESCAPE \'\\\')'); const q = '%' + search.replace(/[\\%_]/g, '\\$&') + '%'; values.push(q, q); }
    if (status && ['ACTIVE', 'SUSPENDED', 'BLACKLISTED'].includes(status)) { conditions.push('account_status=?'); values.push(status); }
    if (role && ['ADMIN', 'STAFF', 'CLIENT'].includes(role)) { conditions.push('role=?'); values.push(role); }
    const rows = await database().prepare('SELECT id,role,full_name,email,kyc_status,video_call_verified,is_trusted_repeat_client,account_status,created_at FROM users WHERE ' + conditions.join(' AND ') + ' ORDER BY created_at DESC LIMIT 200').bind(...values).all();
    await audit(request, administrator.userId, '', 'accounts.list'); return json({ users: rows.results });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request); const administrator = await requireAdmin(request), own = await ensureAccount(administrator), input = await readBody(request), db = database();
    const target = await db.prepare('SELECT * FROM users WHERE id=? AND is_demo=0').bind(String(input?.id)).first<AccountRow>();
    if (!target) throw new ApiError(404, 'Account not found.');
    if (!['ADMIN', 'STAFF', 'CLIENT'].includes(input.role) || !['ACTIVE', 'SUSPENDED', 'BLACKLISTED'].includes(input.accountStatus) || !['UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'].includes(input.kycStatus) || typeof input.trustedRepeatClient !== 'boolean' || typeof input.videoCallVerified !== 'boolean') throw new ApiError(400, 'Select valid account controls.');
    if (isConfiguredAdministrator({userId:target.auth_user_id||'',email:target.email}) && (input.role!=='ADMIN'||input.accountStatus!=='ACTIVE')) throw new ApiError(409,'Change the configured primary administrator allowlist before removing this account access.');
    if (target.id === own.id && (input.role !== 'ADMIN' || input.accountStatus !== 'ACTIVE')) throw new ApiError(409, 'You cannot remove your own administrator access.');
    if (['PENDING_REVIEW','VERIFIED'].includes(input.kycStatus)&&(!target.mobile_number||!target.emergency_contact_name||!target.emergency_contact_relationship||!target.emergency_contact_number))throw new ApiError(409,'The client must complete all required emergency contact details before KYC approval.');
    if (input.kycStatus === 'VERIFIED' && target.kyc_status !== 'VERIFIED') {
      const reviewed = await db.prepare('SELECT id FROM bookings WHERE client_id=? AND verified_at IS NOT NULL LIMIT 1').bind(target.id).first();
      if (!reviewed || !input.videoCallVerified) throw new ApiError(409, 'Complete document review and the video verification through the booking before marking this account verified.');
    }
    if (input.trustedRepeatClient && !target.is_trusted_repeat_client) {
      if (!await db.prepare('SELECT id FROM bookings WHERE client_id=? AND cleared_at IS NOT NULL LIMIT 1').bind(target.id).first()) throw new ApiError(409, 'A cleared prior rental is required before granting trusted repeat-client status.');
    }
    await audit(request, administrator.userId, '', `account.controls.update:${target.id}`);
    await db.prepare('UPDATE users SET role=?,account_status=?,kyc_status=?,video_call_verified=?,is_trusted_repeat_client=?,updated_at=? WHERE id=?').bind(input.role, input.accountStatus, input.kycStatus, Number(input.videoCallVerified), Number(input.trustedRepeatClient), new Date().toISOString(), target.id).run();
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
