import {DEFAULT_CONTACT_EMAIL} from './contact';
import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '../app/chatgpt-auth';
import { adminAllowed } from './rental';

export type AccountRole = 'ADMIN' | 'STAFF' | 'CLIENT';
export type AccountRow = {
  id: string; auth_user_id: string | null; role: AccountRole; full_name: string; email: string;
  mobile_number: string | null; complete_address: string | null; social_media_link: string | null; occupation_or_company_school: string | null;
  emergency_contact_name: string | null; emergency_contact_relationship: string | null; emergency_contact_number: string | null;
  kyc_status: string; video_call_verified: number; is_trusted_repeat_client: number; account_status: string; is_demo: number;
  created_at: string; updated_at: string;
};
export function isConfiguredAdministrator(user: Pick<ChatGPTUser, 'userId' | 'email'>) {
  return adminAllowed(user.userId, env.ADMIN_USER_IDS) || (env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).includes(user.email.toLowerCase()) || user.email.toLowerCase() === (env.ADMIN_CONTACT_EMAIL || env.ADMIN_EMAIL || DEFAULT_CONTACT_EMAIL).toLowerCase();
}
export async function ensureAccount(user: ChatGPTUser): Promise<AccountRow> {
  if (!env.DB) throw new Error('The account database is unavailable.');
  const existing = await env.DB.prepare('SELECT * FROM users WHERE auth_user_id=?').bind(user.userId).first<AccountRow>();
  if (existing) {
    if (existing.account_status === 'ACTIVE' && existing.role !== 'ADMIN' && isConfiguredAdministrator(user)) {
      await env.DB.prepare("UPDATE users SET role='ADMIN',updated_at=? WHERE id=? AND account_status='ACTIVE'").bind(new Date().toISOString(),existing.id).run();
      existing.role='ADMIN';
    }
    return existing;
  }
  const email = user.email.toLowerCase(), now = new Date().toISOString();
  const byEmail = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first<AccountRow>();
  if (byEmail) {
    if (byEmail.auth_user_id && byEmail.auth_user_id !== user.userId) throw new Error('This email is already linked to another identity.');
    await env.DB.prepare('UPDATE users SET auth_user_id=?,updated_at=? WHERE id=? AND auth_user_id IS NULL').bind(user.userId, now, byEmail.id).run();
  } else {
    await env.DB.prepare('INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING')
      .bind(crypto.randomUUID(), user.userId, isConfiguredAdministrator(user) ? 'ADMIN' : 'CLIENT', user.fullName || user.displayName, email, now, now).run();
  }
  const saved = await env.DB.prepare('SELECT * FROM users WHERE auth_user_id=?').bind(user.userId).first<AccountRow>();
  if (!saved) throw new Error('Account registration could not be completed.');
  return saved;
}
export const PRIVATE_PROFILE_FIELDS = {
  mobileNumber: 'mobile_number', completeAddress: 'complete_address', socialMediaLink: 'social_media_link', occupationOrCompanySchool: 'occupation_or_company_school',
  emergencyContactName: 'emergency_contact_name', emergencyContactRelationship: 'emergency_contact_relationship', emergencyContactNumber: 'emergency_contact_number',
} as const;
export function validateProfile(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Enter valid profile details.');
  const value = input as Record<string, unknown>, result: Record<string, string> = {};
  for (const [key, max] of Object.entries({ fullName: 100, mobileNumber: 25, completeAddress: 500, socialMediaLink: 300, occupationOrCompanySchool: 200, emergencyContactName: 100, emergencyContactRelationship: 80, emergencyContactNumber: 25 })) {
    const text = value[key];
    if (typeof text !== 'string' || text.trim().length > max || /[\u0000-\u001f]/.test(text)) throw new Error(`Please check ${key}.`);
    result[key] = text.trim();
  }
  if (result.fullName.length < 2) throw new Error('Enter your full name.');
  for (const key of ['mobileNumber', 'emergencyContactNumber']) if (result[key] && !/^[+\d() -]{7,25}$/.test(result[key])) throw new Error('Enter a valid mobile or emergency contact number.');
  if (result.socialMediaLink) { try { const url = new URL(result.socialMediaLink); if (url.protocol !== 'https:' || url.username || url.password || !['facebook.com','www.facebook.com','m.facebook.com','instagram.com','www.instagram.com'].includes(url.hostname)) throw 0; } catch { throw new Error('Use an HTTPS Facebook or Instagram profile URL.'); } }
  return result;
}
