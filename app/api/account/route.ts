import { getChatGPTUser } from '../../chatgpt-auth';
import { assertSameOrigin, database, failure, identity, json, readBody, ApiError } from '../../../lib/api';
import { ensureAccount, RegistrationRequiredError, PRIVATE_PROFILE_FIELDS, validateProfile } from '../../../lib/accounts';
import { audit, decrypt, encrypt } from '../../../lib/security';
export async function GET() {
  try {
    const user = await getChatGPTUser(); if (!user) throw new ApiError(401, 'Sign in to continue.');
    let account;try{account=await ensureAccount(user);}catch(error){if(error instanceof RegistrationRequiredError)return json({registrationRequired:true});throw error;}
    const profile: Record<string, string> = { fullName: account.full_name };
    for (const [key, column] of Object.entries(PRIVATE_PROFILE_FIELDS)) profile[key] = account[column as keyof typeof account] ? (await decrypt<{ value: string }>(String(account[column as keyof typeof account]))).value : '';
    return json({ account: { id: account.id, email: account.email, role: account.role, fullName: account.full_name, kycStatus: account.kyc_status, videoCallVerified: !!account.video_call_verified, trustedRepeatClient: !!account.is_trusted_repeat_client, accountStatus: account.account_status, createdAt: account.created_at }, profile });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request); const user = await identity(), account = await ensureAccount(user), body = await readBody(request);
    if (body?.emergencyContactConsent !== true) throw new ApiError(400, 'Confirm that your emergency contact knows their details are being provided.');
    let profile; try { profile = validateProfile(body?.profile); } catch (error) { throw new ApiError(400, (error as Error).message); }
    const columns = ['full_name', ...Object.values(PRIVATE_PROFILE_FIELDS), 'updated_at'];
    const values: (string | null)[] = [profile.fullName];
    for (const key of Object.keys(PRIVATE_PROFILE_FIELDS)) values.push(profile[key] ? await encrypt({ value: profile[key] }) : null);
    values.push(new Date().toISOString());
    await audit(request, user.userId, '', 'account.profile.update');
    await database().prepare(`UPDATE users SET ${columns.map(c => c + '=?').join(',')} WHERE id=?`).bind(...values, account.id).run();
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
