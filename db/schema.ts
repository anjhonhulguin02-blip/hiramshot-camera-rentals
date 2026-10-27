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
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), authUserId: text('auth_user_id'), role: text('role').notNull().default('CLIENT'),
  fullName: text('full_name').notNull(), email: text('email').notNull(), passwordHash: text('password_hash'),
  authProvider: text('auth_provider').notNull().default('SITES'), mobileNumber: text('mobile_number'), completeAddress: text('complete_address'),
  socialMediaLink: text('social_media_link'), occupationOrCompanySchool: text('occupation_or_company_school'),
  emergencyContactName: text('emergency_contact_name'), emergencyContactRelationship: text('emergency_contact_relationship'), emergencyContactNumber: text('emergency_contact_number'),
  kycStatus: text('kyc_status').notNull().default('UNVERIFIED'), videoCallVerified: integer('video_call_verified').notNull().default(0),
  isTrustedRepeatClient: integer('is_trusted_repeat_client').notNull().default(0), accountStatus: text('account_status').notNull().default('ACTIVE'),
  isDemo: integer('is_demo').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('users_email_unique').on(t.email), uniqueIndex('users_auth_unique').on(t.authUserId)]);
export const bookings = sqliteTable('bookings', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), requestKey: text('request_key').notNull(),
  startDate: text('start_date').notNull(), endDate: text('end_date').notNull(), days: integer('days').notNull(),
  items: text('items').notNull(), quote: text('quote').notNull(), status: text('status').notNull().default('requested'),
  contact: text('contact').notNull(), personal: text('personal'), verifiedAt: text('verified_at'), signedAt: text('signed_at'),
  contractKey: text('contract_key'), contractHash: text('contract_hash'), contractContentHash: text('contract_content_hash'),
  reservationPaid: integer('reservation_paid').notNull().default(0), paidTotal: integer('paid_total').notNull().default(0),
  turnover: text('turnover'), clearedAt: text('cleared_at'), refundedAt: text('refunded_at'), purgeAt: text('purge_at'), purgedAt: text('purged_at'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
  clientId: text('client_id').references(() => users.id), bookingReferenceCode: text('booking_reference_code'),
  pickupDatetime: text('pickup_datetime'), returnDatetime: text('return_datetime'), destinationOrEvent: text('destination_or_event'),
  turnoverMethod: text('turnover_method').notNull().default('SELF_PICKUP_NORZAGARAY'), lifecycleStatus: text('lifecycle_status').notNull().default('PENDING_DOWNPAYMENT'),
  totalRentalFeeCentavos: integer('total_rental_fee_centavos'), securityDepositCentavos: integer('security_deposit_centavos'), requiredReservationCentavos: integer('required_reservation_centavos'),
  latePenaltyCentavos: integer('late_penalty_centavos').notNull().default(0), damageDeductionCentavos: integer('damage_deduction_centavos').notNull().default(0),
  financialVersion: integer('financial_version').notNull().default(0), lastFinancialOperation: text('last_financial_operation'), returnedAt: text('returned_at'),
  isDemo: integer('is_demo').notNull().default(0),
  kycVersion:integer('kyc_version').notNull().default(0),liveVideoVerifiedAt:text('live_video_verified_at'),liveVideoVerifiedBy:text('live_video_verified_by').references(()=>users.id),antiFraudConsentAt:text('anti_fraud_consent_at'),antiFraudConsentVersion:text('anti_fraud_consent_version'),
}, t=>[uniqueIndex('booking_idempotency').on(t.userId,t.requestKey),index('booking_owner').on(t.userId,t.createdAt),index('booking_purge').on(t.purgeAt),uniqueIndex('booking_reference_unique').on(t.bookingReferenceCode)]);
export const bookingDays = sqliteTable('booking_days', { id:text('id').primaryKey(), bookingId:text('booking_id').notNull().references(()=>bookings.id), unitId:text('unit_id').notNull().references(()=>units.id), day:text('day').notNull() }, t=>[uniqueIndex('unit_day_exclusive').on(t.unitId,t.day),index('booking_days_booking').on(t.bookingId)]);
export const kycDocuments = sqliteTable('kyc_documents', { id:text('id').primaryKey(), bookingId:text('booking_id').notNull().references(()=>bookings.id), kind:text('kind').notNull(), objectKey:text('object_key').notNull(), mime:text('mime').notNull(), size:integer('size').notNull(), createdAt:text('created_at').notNull(), deletedAt:text('deleted_at'),sha256:text('sha256'),scanStatus:text('scan_status').notNull().default('LEGACY_REVIEW_REQUIRED'),reviewedAt:text('reviewed_at'),reviewedBy:text('reviewed_by').references(()=>users.id) }, t=>[uniqueIndex('booking_document_kind').on(t.bookingId,t.kind)]);
export const securityEvents = sqliteTable('security_events', { id:text('id').primaryKey(), actor:text('actor').notNull(), ip:text('ip').notNull(), bookingId:text('booking_id').notNull(), action:text('action').notNull(), createdAt:text('created_at').notNull(), mac:text('mac').notNull() });
export const mfaUsed = sqliteTable('mfa_used', { key:text('key').primaryKey(), expiresAt:integer('expires_at').notNull() });
export const adminMfa = sqliteTable('admin_mfa', { userId:text('user_id').primaryKey(), secret:text('secret').notNull(), enabled:integer('enabled').notNull().default(0), createdAt:text('created_at').notNull() });
export const equipmentInventory = sqliteTable('equipment_inventory', {
  id: text('id').primaryKey(), unitId: text('unit_id').notNull().references(() => units.id), equipmentId: text('equipment_id').notNull().references(() => equipment.id),
  packageName: text('package_name').notNull(), unitName: text('unit_name').notNull(), category: text('category').notNull(), serialNumber: text('serial_number'),
  batteryCodes: text('battery_codes').notNull().default('[]'), sdCardDetails: text('sd_card_details'),
  rate1To2Days: integer('rate_1_to_2_days').notNull(), rate3To6Days: integer('rate_3_to_6_days').notNull(), rate7PlusDays: integer('rate_7_plus_days').notNull(),
  securityDepositAmount: integer('security_deposit_amount').notNull(), marketReplacementValue: integer('market_replacement_value'),
  availabilityStatus: text('availability_status').notNull().default('AVAILABLE'), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [uniqueIndex('inventory_unit_package').on(t.unitId, t.packageName)]);
export const unitReservations = sqliteTable('unit_reservations', {
  id: text('id').primaryKey(), unitId: text('unit_id').notNull().references(() => units.id), bookingId: text('booking_id').notNull().references(() => bookings.id),
  pickupMs: integer('pickup_ms').notNull(), returnMs: integer('return_ms').notNull(),
}, t => [uniqueIndex('reservation_booking_unit').on(t.bookingId, t.unitId), index('reservation_overlap').on(t.unitId, t.pickupMs, t.returnMs)]);
export const bookingItems = sqliteTable('booking_items', {
  id: text('id').primaryKey(), bookingId: text('booking_id').notNull().references(() => bookings.id), equipmentId: text('equipment_id').notNull(), packageName: text('package_name').notNull(),
  rentalCentavos: integer('rental_centavos').notNull(), depositCentavos: integer('deposit_centavos').notNull(),
}, t => [uniqueIndex('booking_equipment_item').on(t.bookingId, t.equipmentId)]);
export const paymentReceipts = sqliteTable('payment_receipts', {
  id: text('id').primaryKey(), bookingId: text('booking_id').notNull().references(() => bookings.id), uploadedBy: text('uploaded_by').notNull().references(() => users.id),
  objectKey: text('object_key').notNull(), mime: text('mime').notNull(), size: integer('size').notNull(), createdAt: text('created_at').notNull(),
});
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(), bookingId: text('booking_id').notNull().references(() => bookings.id), clientId: text('client_id').notNull().references(() => users.id),
  recordedByAdminId: text('recorded_by_admin_id').notNull().references(() => users.id), requestKey: text('request_key').notNull(), paymentIdentity: text('payment_identity'),
  kind: text('kind').notNull(), amountCentavos: integer('amount_centavos').notNull(), paymentMethod: text('payment_method').notNull(), paymentReferenceNumber: text('payment_reference_number'),
  receiptId: text('receipt_id').references(() => paymentReceipts.id), remarks: text('remarks').notNull(), isDemo: integer('is_demo').notNull().default(0), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('payment_idempotency').on(t.recordedByAdminId, t.requestKey), uniqueIndex('payment_reference_unique').on(t.paymentIdentity)]);
export const financialTransactions = sqliteTable('financial_transactions', {
  id: text('id').primaryKey(), paymentId: text('payment_id').notNull().references(() => payments.id), bookingId: text('booking_id').notNull().references(() => bookings.id),
  clientId: text('client_id').notNull().references(() => users.id), recordedByAdminId: text('recorded_by_admin_id').notNull().references(() => users.id),
  equipmentId: text('equipment_id'), transactionType: text('transaction_type').notNull(), amountCentavos: integer('amount_centavos').notNull(),
  isNetRevenue: integer('is_net_revenue').notNull(), escrowEffectCentavos: integer('escrow_effect_centavos').notNull().default(0), cashEffectCentavos: integer('cash_effect_centavos').notNull().default(0),
  lineIndex: integer('line_index').notNull(), isDemo: integer('is_demo').notNull().default(0), remarks: text('remarks').notNull(), createdAt: text('created_at').notNull(),
}, t => [uniqueIndex('ledger_payment_line').on(t.paymentId, t.lineIndex), index('ledger_booking').on(t.bookingId), index('ledger_month').on(t.createdAt)]);
export const paymentReversals = sqliteTable('payment_reversals', {
  originalPaymentId: text('original_payment_id').primaryKey().references(() => payments.id),
  reversalPaymentId: text('reversal_payment_id').notNull().references(() => payments.id), createdAt: text('created_at').notNull(),
});
