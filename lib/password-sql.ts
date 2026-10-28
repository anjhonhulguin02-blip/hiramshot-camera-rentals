export const CONSUME_PASSWORD_TOKEN_SQL=`UPDATE password_tokens SET used_nonce=?
 WHERE token_hash=? AND purpose=? AND used_nonce IS NULL AND expires_at>?
 AND EXISTS(SELECT 1 FROM password_credentials c WHERE c.id=credential_id AND c.session_version=expected_version)`;
export const UPDATE_PASSWORD_SQL=`UPDATE password_credentials
 SET password_hash=?,verified_at=COALESCE(verified_at,?),session_version=session_version+1,updated_at=?
 WHERE id=? AND session_version=?
 AND EXISTS(SELECT 1 FROM password_tokens t WHERE t.token_hash=? AND t.credential_id=password_credentials.id AND t.used_nonce=?)`;
