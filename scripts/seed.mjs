import {DEFAULT_CONTACT_EMAIL} from '../lib/contact.ts';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { INITIAL_CATALOG, calculateQuote, dailyRateTier } from '../lib/catalog.ts';

const argumentsSet = new Set(process.argv.slice(2));
if ([...argumentsSet].some(a => !['--bootstrap-only', '--apply-local'].includes(a))) throw new Error('Only --bootstrap-only and --apply-local are supported. Remote seeding is deliberately unavailable.');
const now = '2026-10-26T00:00:00.000Z', quote = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
const statements = ['PRAGMA foreign_keys=ON;'];
const insert = (table, row, suffix = '') => statements.push(`INSERT INTO ${table}(${Object.keys(row).join(',')}) VALUES (${Object.values(row).map(quote).join(',')}) ${suffix};`);
const adminId = '00000000-0000-4000-8000-000000000001';
insert('users', { id: adminId, role: 'ADMIN', full_name: 'HiramShot Administrator', email: DEFAULT_CONTACT_EMAIL, created_at: now, updated_at: now }, 'ON CONFLICT(email) DO NOTHING');
for (const gear of INITIAL_CATALOG) {
 insert('equipment', { id: gear.id, config: JSON.stringify(gear), updated_at: now }, 'ON CONFLICT(id) DO NOTHING');
 for (let i = 1; i <= gear.units; i++) {
  const unitId = `${gear.id}-unit-${i}`;
  insert('units', { id: unitId, equipment_id: gear.id, active: 1 }, 'ON CONFLICT(id) DO NOTHING');
  for (const variant of gear.variants) insert('equipment_inventory', { id: randomUUID(), unit_id: unitId, equipment_id: gear.id, package_name: variant.name, unit_name: gear.name + (gear.variants.length > 1 ? ' ' + variant.name : ''), category: gear.category, rate_1_to_2_days: dailyRateTier(variant, 1).max, rate_3_to_6_days: dailyRateTier(variant, 3).max, rate_7_plus_days: dailyRateTier(variant, 7).max, security_deposit_amount: variant.deposit[1], created_at: now, updated_at: now }, 'ON CONFLICT(unit_id,package_name) DO NOTHING');
 }
}
if (!argumentsSet.has('--bootstrap-only')) {
 for (const [index, name] of ['Sample Client Alpha', 'Sample Client Beta'].entries()) {
  const clientId = `00000000-0000-4000-8000-00000000001${index}`, bookingId = `00000000-0000-4000-8000-00000000002${index}`, paymentId = `00000000-0000-4000-8000-00000000003${index}`;
  insert('users', { id: clientId, auth_user_id: 'demo-client-' + index, role: 'CLIENT', full_name: name + ' · DEMO ONLY', email: `demo-client-${index}@example.invalid`, is_demo: 1, created_at: now, updated_at: now }, 'ON CONFLICT(id) DO NOTHING');
  const items = [{ equipmentId: index ? 'x6' : 'x5', variant: 'Standard', addons: [] }], q = calculateQuote(INITIAL_CATALOG, items, 3);
  insert('bookings', { id: bookingId, user_id: 'demo-client-' + index, client_id: clientId, request_key: bookingId, booking_reference_code: 'HSR-DEMO-000' + index, start_date: '2026-11-01', end_date: '2026-11-04', pickup_datetime: '2026-11-01T09:00:00+08:00', return_datetime: '2026-11-04T09:00:00+08:00', days: 3, items: JSON.stringify(items), quote: JSON.stringify(q), status: 'requested', contact: 'DEMO-NOT-A-REAL-ENCRYPTED-CONTACT', is_demo: 1, created_at: now, updated_at: now }, 'ON CONFLICT(id) DO NOTHING');
  insert('payments', { id: paymentId, booking_id: bookingId, client_id: clientId, recorded_by_admin_id: adminId, request_key: paymentId, kind: 'RESERVATION', amount_centavos: q.reservationMax * 100, payment_method: 'CASH', remarks: 'Synthetic local fixture. No money received.', is_demo: 1, created_at: now }, 'ON CONFLICT(id) DO NOTHING');
  insert('financial_transactions', { id: `00000000-0000-4000-8000-00000000004${index}`, payment_id: paymentId, booking_id: bookingId, client_id: clientId, recorded_by_admin_id: adminId, equipment_id: items[0].equipmentId, transaction_type: 'RESERVATION_DOWNPAYMENT', amount_centavos: q.reservationMax * 100, is_net_revenue: 1, escrow_effect_centavos: 0, cash_effect_centavos: q.reservationMax * 100, line_index: 0, is_demo: 1, remarks: 'Synthetic local fixture. Excluded from real analytics.', created_at: now }, 'ON CONFLICT(id) DO NOTHING');
 }
}
mkdirSync('outputs', { recursive: true });
const file = resolve('outputs', argumentsSet.has('--bootstrap-only') ? 'bootstrap.sql' : 'seed-local.sql');
writeFileSync(file, statements.join('\n') + '\n');
if (argumentsSet.has('--apply-local')) {
 const config = resolve('dist/server/wrangler.json');
 if (!existsSync(config)) throw new Error('Build the application first, then run seed:local.');
 execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', config, '--persist-to', '.wrangler/state', '--file', file], { stdio: 'inherit' });
}
console.log(`Seed SQL prepared: ${file}. Demo fixtures are local only; production bootstrap contains no sample earnings.`);
