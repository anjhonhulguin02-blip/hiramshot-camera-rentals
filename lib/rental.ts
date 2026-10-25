export const GEAR = [
  { id: 'x5', name: 'Insta360 X5', category: 'Action camera', tag: 'For the whole adventure', image: '/assets/x5.jpg', description: 'Road trips, spontaneous weekends, at lahat ng nasa pagitan. Isama ang X5 sa next mong lakad.', packages: ['Standard'], battery: true },
  { id: 'x6', name: 'Insta360 X6', category: 'Action camera', tag: 'A fresh perspective', image: '/assets/x6.jpg', description: 'Para sa bagong destinations at bagong memories. Piliin ang X6 para sa next mong content.', packages: ['Standard'], battery: true },
  { id: 'neo2', name: 'DJI Neo 2', category: 'Drone', tag: 'Take the scenic route', image: '/assets/neo2.jpg', description: 'Ibang anggulo naman. Choose the drone on its own, or the Fly More Combo for your next shoot.', packages: ['Standard', 'Fly More Combo'], battery: false },
] as const;
export type GearId = typeof GEAR[number]['id'];
export function todayManila(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function rentalDays(start: string, end: string) { return Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000); }
export function occupiedDays(start: string, end: string) { const result: string[] = []; for (let time = Date.parse(start + 'T00:00:00Z'); time < Date.parse(end + 'T00:00:00Z'); time += 86400000) result.push(new Date(time).toISOString().slice(0, 10)); return result; }
export function isDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value; }
export function validateDates(start: unknown, end: unknown, today = todayManila()) {
  if (!isDate(start) || !isDate(end)) throw new Error('Choose valid pickup and return dates.');
  const days = rentalDays(start, end);
  if (start < today) throw new Error('Pickup date must be today or later.');
  if (days < 1 || days > 30) throw new Error('Choose a rental of 1–30 days. Return date must follow pickup.');
  if (rentalDays(today, start) > 365) throw new Error('Choose a pickup date within the next year.');
  return days;
}
export function validateRental(input: unknown, today = todayManila()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request.');
  const v = input as Record<string, unknown>, gear = GEAR.find(g => g.id === v.gear);
  if (!gear || !(gear.packages as readonly string[]).includes(String(v.package))) throw new Error('Choose a valid unit and package.');
  const days = validateDates(v.startDate, v.endDate, today);
  if (typeof v.battery !== 'boolean' || (v.battery && !gear.battery)) throw new Error('Invalid add-on for this unit.');
  const str = (key: string, min: number, max: number) => { const value = v[key]; if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000b-\u001f]/.test(value)) throw new Error(`Please check ${key}.`); return value.trim(); };
  const name = str('name', 2, 100), email = str('email', 5, 254), phone = str('phone', 7, 25), notes = str('notes', 0, 1000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!/^[+()\d\s-]{7,25}$/.test(phone)) throw new Error('Enter a valid contact number.');
  if (v.consent !== true) throw new Error('Please agree to the request privacy notice.');
  if (typeof v.requestKey !== 'string' || !/^[\da-f-]{36}$/i.test(v.requestKey)) throw new Error('Invalid request key. Refresh and try again.');
  return { gear: gear.id, package: String(v.package), startDate: v.startDate as string, endDate: v.endDate as string, days, battery: v.battery, addonTotal: v.battery ? days * 150 : 0, name, email, phone, notes, requestKey: v.requestKey };
}
export function adminAllowed(userId: string, allowlist: string | undefined) { return !!allowlist?.split(',').map(v => v.trim()).filter(Boolean).includes(userId); }
export type Rental = { id: string; user_id: string; gear: GearId; package: string; start_date: string; end_date: string; days: number; battery: number; addon_total: number; name: string; email: string; phone: string; notes: string; status: 'pending' | 'confirmed' | 'declined' | 'cancelled'; quote_total: number | null; created_at: string; };
