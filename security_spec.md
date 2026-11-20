# Security Specification: Testo Home

## 1. Data Invariants
1. **Identity Integrity**: Every user profile (`/users/{userId}`), saved address (`/users/{userId}/addresses/{addressId}`), family patient profile (`/patients/{patientId}`), booking (`/bookings/{bookingId}`), and report (`/reports/{reportId}`) is strictly bound to its owning Firebase Auth UID (`request.auth.uid`).
2. **No Self-Assigned Admin Privileges**: Regular users can never write to `/admins/{uid}` or inject role/privilege fields (`role`, `isAdmin`) into `/users/{userId}`. Admin access is determined strictly by `/admins/{request.auth.uid}` existence or verified bootstrapped admin email (`email_verified == true`).
3. **PII & Medical Report Isolation**: Customer PII (`users`, `patients`, `addresses`, `bookings`) and medical reports (`reports`) can NEVER be listed or read by other customers (`get`/`list` strictly requires `resource.data.userId == request.auth.uid || isAdmin()`). Phlebotomist contact data (`/phlebotomists`) is admin-only; customers see only the agent assigned to their own booking.
4. **Payment State Integrity**: Customers cannot mark their own booking `paymentStatus` as `'paid'`. On creation, `paymentStatus` MUST be `'pending'` and `status` MUST be `'Pending'`. Customers can only submit `'awaiting_verification'` payment references, request reschedules, or cancel non-completed bookings.
5. **Terminal State Locking**: Once a booking reaches `'Cancelled'` or `'Report Ready'`, customers cannot mutate the booking.
6. **Temporal Integrity & Path Hardening**: All document IDs are validated against `^[a-zA-Z0-9_\\-]+$`, all strings enforce `.size()` bounds, and `createdAt`/`updatedAt` timestamps must match `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **User Role Escalation**: Customer writes `{ uid: 'u1', ..., isAdmin: true }` to `/users/u1` (ghost field rejected by `hasOnly`).
2. **Cross-User Profile Read**: Customer `u1` attempts `get` on `/users/u2`.
3. **Unverified Email Spoof**: User with `email: 'sibansh.0251mba292@dgu.ac.in'` and `email_verified: false` attempts admin write on `/tests/t1`.
4. **Self-Admin Registration**: Customer `u1` writes `{ uid: 'u1', email: 'u1@test.com', name: 'Hacker' }` to `/admins/u1`.
5. **Blanket Booking Scrape**: Customer `u1` executes unfiltered `list` on `/bookings`.
6. **Booking Spoofed Owner**: Customer `u1` creates booking in `/bookings/b1` with `userId: 'u2'`.
7. **Booking Pre-Paid Bypass**: Customer `u1` creates booking in `/bookings/b1` with `paymentStatus: 'paid'` and `status: 'Confirmed'`.
8. **Customer Payment Tampering**: Customer `u1` updates `/bookings/b1` to set `paymentStatus: 'paid'` or `finalAmount: 1`.
9. **Terminal Booking Mutation**: Customer `u1` updates `/bookings/b_cancelled` (already `'Cancelled'`) back to `'Pending'`.
10. **Report Unauthorized Access**: Customer `u1` attempts `get` on `/reports/r_belonging_to_u2` or `create` on `/reports/r1`.
11. **Phlebotomist PII Scrape**: Customer `u1` attempts `list` on `/phlebotomists`.
12. **Resource Poisoning / Oversized ID**: Customer `u1` attempts `create` on `/bookings/` with a 200-char ID or 10KB `addressLine` string.
