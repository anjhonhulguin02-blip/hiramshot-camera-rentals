'use client';
import { useRef, useState, type FormEvent } from 'react';
import Challenge from './challenge';
export type PaymentReceipt = { id: string; created_at: string };
export default function PaymentReceipts({ bookingId, receipts, enabled, siteKey, reload }: { bookingId: string; receipts: PaymentReceipt[]; enabled: boolean; siteKey: string | null; reload: () => Promise<void> }) {
 const [token, setToken] = useState(''), [reset, setReset] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
 const formRef = useRef<HTMLFormElement>(null);
 async function upload(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); setBusy(true); setError(''); const body = new FormData(e.currentTarget); body.set('turnstileToken', token);
  try { const response = await fetch(`/api/bookings/${bookingId}/receipts`, { method: 'POST', body }), data = await response.json() as any; if (!response.ok) throw new Error(data.error); formRef.current?.reset(); await reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); setToken(''); setReset(n => n + 1); }
 }
 return <section className="booking-panel"><h2>Your payment receipts.</h2><p>Upload a receipt after paying through a channel confirmed by HiramShot. The team must verify the transaction before it changes your booking balance.</p>{error && <p className="error-text" role="alert">{error}</p>}{receipts.map((r, i) => <p key={r.id}><a className="text-link" href={'/api/receipts/' + r.id}>Download private receipt {i + 1}</a> · {new Date(r.created_at).toLocaleDateString('en-PH')}</p>)}{!enabled ? <p className="challenge-note">Receipt uploads are awaiting private file-scanning and security configuration.</p> : <form onSubmit={upload} ref={formRef}><label>Receipt file · maximum 5 MB<input name="file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required /></label><Challenge siteKey={siteKey} action="receipt" onToken={setToken} reset={reset} /><button className="button secondary" disabled={busy || !token}>{busy ? 'Uploading receipt…' : 'Upload private payment receipt'}</button></form>}</section>;
}
