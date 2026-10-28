declare namespace Cloudflare {
  interface Env {
    ASSETS?: Fetcher;
    AUTH_SECRET?: string;
    AUTH_GOOGLE_ID?: string;
    AUTH_GOOGLE_SECRET?: string;
    PASSWORD_AUTH_ENABLED?: string;
    PASSWORD_HASHING_VERIFIED?: string;
    AUTH_EMAIL_FROM?: string;
    RESEND_API_KEY?: string;
    REVIEW_MEDIA_ENABLED?: string;
    REVIEW_MEDIA_PROCESSOR_URL?: string;
    REVIEW_MEDIA_PROCESSOR_TOKEN?: string;
    AUTH_TRUST_HOST?: string;
    REVIEW_MODE?: string;
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
    MALWARE_SCANNER?: Fetcher;
    MALWARE_SCANNER_TOKEN?: string;
    PURGE_SECRET?: string;
    KYC_RETENTION_DAYS?: string;
    ADMIN_CONTACT_EMAIL?: string;
    ADMIN_ACCESS_EMAILS?: string;
    APP_BASE_URL?: string;
    NEXT_PUBLIC_SITE_URL?: string;
    CUSTOM_DOMAIN?: string;
    PUBLIC_INDEXING_ENABLED?: string;
  }
}
