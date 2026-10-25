declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_USER_IDS?: string;
    ADMIN_EMAIL?: string;
    CONTACT_EMAIL?: string;
    ADMIN_TOTP_SECRET?: string;
    ADMIN_SESSION_SECRET?: string;
    DATA_ENCRYPTION_KEY?: string;
    AUDIT_HMAC_KEY?: string;
    DOWNLOAD_SECRET?: string;
    TURNSTILE_SITE_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    KYC_ENABLED?: string;
    MALWARE_SCANNER_URL?: string;
    MALWARE_SCANNER_TOKEN?: string;
    PURGE_SECRET?: string;
    KYC_RETENTION_DAYS?: string;
  }
}
