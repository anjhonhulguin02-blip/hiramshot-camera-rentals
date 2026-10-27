export const DOCUMENT_KINDS = ['government-id-1', 'government-id-2', 'company-school-id', 'proof-of-billing', 'selfie-with-id'] as const;
export const DOCUMENT_LABELS: Record<typeof DOCUMENT_KINDS[number], string> = {
 'government-id-1': 'Valid government ID 1', 'government-id-2': 'Valid government ID 2',
 'company-school-id': 'Company or school ID', 'proof-of-billing': 'Latest proof of billing', 'selfie-with-id': 'Selfie holding one valid ID',
};
export const VIDEO_REVIEW_ACKNOWLEDGEMENT = 'I have completed the 1-minute live video call with the client and verified their physical ID matches.';
export const CLEAN_KYC_PREDICATE = "deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id')";
export const COUNT_CLEAN_KYC_SQL = 'SELECT COUNT(DISTINCT kind) AS count FROM kyc_documents WHERE booking_id=? AND ' + CLEAN_KYC_PREDICATE;
export function validateReviewAcknowledgement(input: {videoCallCompleted?:unknown;documentsReviewed?:unknown}) {
 if(input.videoCallCompleted!==true||input.documentsReviewed!==true)throw new Error('Review every required document and confirm the live video call and physical ID match.');
}
export function normalizePhilippineMobile(value: unknown) {
 if (typeof value !== 'string' || value.length > 25 || !/^[+\d ()-]+$/.test(value)) throw new Error('Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.');
 let number = value.replace(/[ ()-]/g, '');
 if (/^09\d{9}$/.test(number)) number = '+63' + number.slice(1);
 else if (/^639\d{9}$/.test(number)) number = '+' + number;
 if (!/^\+639\d{9}$/.test(number)) throw new Error('Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.');
 return number;
}
export function validateEmergencyContacts(mobile: unknown, name: unknown, relationship: unknown, emergency: unknown) {
 if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100 || typeof relationship !== 'string' || relationship.trim().length < 2 || relationship.length > 80) throw new Error('An emergency contact name and relationship are required.');
 const own = normalizePhilippineMobile(mobile), contact = normalizePhilippineMobile(emergency);
 if (own === contact) throw new Error('The emergency contact mobile number must be different from your own mobile number.');
 return { mobile: own, emergencyName: name.trim(), emergencyRelationship: relationship.trim(), emergencyPhone: contact };
}
export function hasCompleteKyc(documents: {kind: string; deleted_at?: string | null; scan_status?: string; sha256?: string | null; reviewed_at?: string | null}[], reviewed = false) {
 return DOCUMENT_KINDS.every(kind => documents.some(d => d.kind === kind && !d.deleted_at && d.scan_status === 'CLEAN' && /^[a-f0-9]{64}$/.test(d.sha256 || '') && (!reviewed || !!d.reviewed_at)));
}
