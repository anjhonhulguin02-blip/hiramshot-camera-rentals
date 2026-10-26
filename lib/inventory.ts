import { database } from './api';
import { dailyRateTier, type Equipment } from './catalog';
export const AVAILABLE_UNIT_SQL = "SELECT id FROM units WHERE equipment_id=? AND active=1 AND id NOT IN(SELECT unit_id FROM unit_reservations WHERE pickup_ms<? AND return_ms>?) AND id NOT IN(SELECT unit_id FROM booking_days WHERE day>=? AND day<?) AND id NOT IN(SELECT r.unit_id FROM unit_reservations r JOIN bookings b ON b.id=r.booking_id WHERE b.status='out' AND r.return_ms<?) ORDER BY id LIMIT 1";
export function findAvailableUnit(equipmentId: string, pickupMs: number, returnMs: number, startDate: string, endDate: string) {
 return database().prepare(AVAILABLE_UNIT_SQL).bind(equipmentId, returnMs, pickupMs, startDate, endDate, Date.now()).first<{id:string}>();
}
export async function synchronizeInventory(list: Equipment[]) {
  const db = database(), now = new Date().toISOString();
  for (const equipment of list) {
    await db.prepare('INSERT INTO equipment(id,config,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config,updated_at=excluded.updated_at').bind(equipment.id, JSON.stringify(equipment), now).run();
    for (let i = 1; i <= equipment.units; i++) {
      const unitId = `${equipment.id}-unit-${i}`;
      await db.prepare('INSERT INTO units(id,equipment_id,active) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET active=CASE WHEN EXISTS(SELECT 1 FROM equipment_inventory WHERE unit_id=excluded.id AND availability_status=\'MAINTENANCE\') THEN 0 ELSE excluded.active END').bind(unitId, equipment.id, Number(equipment.active)).run();
      await db.batch(equipment.variants.map(variant => db.prepare('INSERT INTO equipment_inventory(id,unit_id,equipment_id,package_name,unit_name,category,rate_1_to_2_days,rate_3_to_6_days,rate_7_plus_days,security_deposit_amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(unit_id,package_name) DO UPDATE SET unit_name=excluded.unit_name,category=excluded.category,rate_1_to_2_days=excluded.rate_1_to_2_days,rate_3_to_6_days=excluded.rate_3_to_6_days,rate_7_plus_days=excluded.rate_7_plus_days,security_deposit_amount=excluded.security_deposit_amount,updated_at=excluded.updated_at')
        .bind(crypto.randomUUID(), unitId, equipment.id, variant.name, equipment.name + (equipment.variants.length > 1 ? ' ' + variant.name : ''), equipment.category, dailyRateTier(variant, 1)?.max ?? 0, dailyRateTier(variant, 3)?.max ?? 0, dailyRateTier(variant, 7)?.max ?? 0, variant.deposit[1], now, now)));
    }
    await db.prepare('UPDATE units SET active=0 WHERE equipment_id=? AND id NOT IN (' + Array(equipment.units).fill('?').join(',') + ')').bind(equipment.id, ...Array.from({ length: equipment.units }, (_, i) => `${equipment.id}-unit-${i + 1}`)).run();
  }
}
