/**
 * Phase 0: Security Rules Verification Spec (Dirty Dozen Test Suite)
 * Verifies that all 12 adversarial payloads fail against Testo Home Firestore Rules.
 * Run with Firebase Emulator Suite when testing locally:
 *   firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: { uid: string; email: string; email_verified: boolean };
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'User Role Escalation via Ghost Field',
    collectionPath: 'users/u1',
    operation: 'create',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { uid: 'u1', name: 'User One', email: 'u1@example.com', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Profile PII Read',
    collectionPath: 'users/u2',
    operation: 'get',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Admin Spoof',
    collectionPath: 'tests/t1',
    operation: 'create',
    actor: { uid: 'spoof', email: 'sibansh.0251mba292@dgu.ac.in', email_verified: false },
    payload: { name: 'Spoofed Test', price: 1 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-Admin Registration',
    collectionPath: 'admins/u1',
    operation: 'create',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { uid: 'u1', email: 'u1@example.com', name: 'Hacker' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Blanket Booking List Scrape',
    collectionPath: 'bookings',
    operation: 'list',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Booking Spoofed Owner UID',
    collectionPath: 'bookings/b1',
    operation: 'create',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { userId: 'u2', bookingCode: 'TH-999', status: 'Pending', paymentStatus: 'pending' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Booking Pre-Paid Status Bypass on Create',
    collectionPath: 'bookings/b2',
    operation: 'create',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { userId: 'u1', bookingCode: 'TH-1000', status: 'Confirmed', paymentStatus: 'paid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Customer Payment & Amount Tampering on Update',
    collectionPath: 'bookings/b1',
    operation: 'update',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { paymentStatus: 'paid', finalAmount: 1 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal Cancelled Booking Re-Activation',
    collectionPath: 'bookings/b_cancelled',
    operation: 'update',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { status: 'Pending' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthorized Report Creation by Customer',
    collectionPath: 'reports/r1',
    operation: 'create',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { userId: 'u1', bookingId: 'b1', reportTitle: 'Forged Report' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Phlebotomist PII List Scrape',
    collectionPath: 'phlebotomists',
    operation: 'list',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Oversized Document ID Poisoning',
    collectionPath: `bookings/${'a'.repeat(200)}`,
    operation: 'create',
    actor: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: { userId: 'u1', bookingCode: 'TH-1001' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
