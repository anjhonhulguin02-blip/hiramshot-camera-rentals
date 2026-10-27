export type RequestLimitPolicy = { scope: string; limit: number; windowSeconds: number };
export const UNVERIFIED_BOOKING_LIMIT = { scope: 'booking', limit: 3, windowSeconds: 3600 };
export const VERIFIED_BOOKING_LIMIT = { scope: 'booking', limit: 10, windowSeconds: 3600 };
export const FILE_UPLOAD_LIMIT = { scope: 'files', limit: 10, windowSeconds: 3600 };
export const REGISTRATION_LIMIT = { scope: 'registration', limit: 3, windowSeconds: 3600 };
// Materialization ensures both counters are admitted against one atomic snapshot.
export const CONSUME_LIMIT_SQL = `WITH allowance AS MATERIALIZED (
 SELECT COALESCE((SELECT SUM(count) FROM request_limits WHERE key>=? AND key<? AND expires_at>?),0)+?<=?
 AND COALESCE((SELECT SUM(count) FROM request_limits WHERE key>=? AND key<? AND expires_at>?),0)+?<=? AS permitted
) INSERT INTO request_limits(key,count,expires_at)
 SELECT ?,?,? FROM allowance WHERE permitted
 UNION ALL SELECT ?,?,? FROM allowance WHERE permitted`;
export function requestLimitBindings(userPrefix: string, ipPrefix: string, policy: RequestLimitPolicy, now: number, nonce: string, cost = 1) {
 if (!Number.isSafeInteger(cost) || cost < 1 || cost > policy.limit) throw new Error('Invalid request limit cost.');
 const expires = now + policy.windowSeconds;
 return [userPrefix, userPrefix + '\uffff', now, cost, policy.limit, ipPrefix, ipPrefix + '\uffff', now, cost, policy.limit, userPrefix + nonce, cost, expires, ipPrefix + nonce, cost, expires];
}
