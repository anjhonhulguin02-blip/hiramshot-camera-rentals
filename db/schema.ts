import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const rentals = sqliteTable('rentals', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), requestKey: text('request_key').notNull(), gear: text('gear').notNull(),
  package: text('package').notNull(), startDate: text('start_date').notNull(), endDate: text('end_date').notNull(), days: integer('days').notNull(),
  battery: integer('battery').notNull().default(0), addonTotal: integer('addon_total').notNull(), name: text('name').notNull(),
  email: text('email').notNull(), phone: text('phone').notNull(), notes: text('notes').notNull(), status: text('status').notNull().default('pending'),
  quoteTotal: integer('quote_total'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('rentals_idempotency').on(t.userId, t.requestKey), index('rentals_user').on(t.userId, t.createdAt)]);
export const bookedDays = sqliteTable('booked_days', {
  id: text('id').primaryKey(), rentalId: text('rental_id').notNull().references(() => rentals.id), gear: text('gear').notNull(), day: text('day').notNull(),
}, t => [uniqueIndex('gear_day_exclusive').on(t.gear, t.day), index('days_rental').on(t.rentalId)]);
export const requestLimits = sqliteTable('request_limits', { key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull() });
export const auditLog = sqliteTable('audit_log', { id: text('id').primaryKey(), actor: text('actor').notNull(), rentalId: text('rental_id').notNull(), action: text('action').notNull(), createdAt: text('created_at').notNull() });
export const equipment = sqliteTable('equipment', { id: text('id').primaryKey(), config: text('config').notNull(), updatedAt: text('updated_at').notNull() });
export const units = sqliteTable('units', { id: text('id').primaryKey(), equipmentId: text('equipment_id').notNull().references(()=>equipment.id), active: integer('active').notNull().default(1) }, t=>[index('units_equipment').on(t.equipmentId)]);
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), requestKey: text('request_key').notNull(),
  startDate: text('start_date').notNull(), endDate: text('end_date').notNull(), days: integer('days').notNull(),
  items: text('items').notNull(), quote: text('quote').notNull(), status: text('status').notNull().default('requested'),
  contact: text('contact').notNull(), personal: text('personal'), verifiedAt: text('verified_at'), signedAt: text('signed_at'),
  contractKey: text('contract_key'), contractHash: text('contract_hash'), contractContentHash: text('contract_content_hash'),
  reservationPaid: integer('reservation_paid').notNull().default(0), paidTotal: integer('paid_total').notNull().default(0),
  turnover: text('turnover'), clearedAt: text('cleared_at'), refundedAt: text('refunded_at'), purgeAt: text('purge_at'), purgedAt: text('purged_at'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t=>[uniqueIndex('booking_idempotency').on(t.userId,t.requestKey),index('booking_owner').on(t.userId,t.createdAt),index('booking_purge').on(t.purgeAt)]);
export const bookingDays = sqliteTable('booking_days', { id:text('id').primaryKey(), bookingId:text('booking_id').notNull().references(()=>bookings.id), unitId:text('unit_id').notNull().references(()=>units.id), day:text('day').notNull() }, t=>[uniqueIndex('unit_day_exclusive').on(t.unitId,t.day),index('booking_days_booking').on(t.bookingId)]);
export const kycDocuments = sqliteTable('kyc_documents', { id:text('id').primaryKey(), bookingId:text('booking_id').notNull().references(()=>bookings.id), kind:text('kind').notNull(), objectKey:text('object_key').notNull(), mime:text('mime').notNull(), size:integer('size').notNull(), createdAt:text('created_at').notNull(), deletedAt:text('deleted_at') }, t=>[uniqueIndex('booking_document_kind').on(t.bookingId,t.kind)]);
export const securityEvents = sqliteTable('security_events', { id:text('id').primaryKey(), actor:text('actor').notNull(), ip:text('ip').notNull(), bookingId:text('booking_id').notNull(), action:text('action').notNull(), createdAt:text('created_at').notNull(), mac:text('mac').notNull() });
export const mfaUsed = sqliteTable('mfa_used', { key:text('key').primaryKey(), expiresAt:integer('expires_at').notNull() });
export const adminMfa = sqliteTable('admin_mfa', { userId:text('user_id').primaryKey(), secret:text('secret').notNull(), enabled:integer('enabled').notNull().default(0), createdAt:text('created_at').notNull() });
