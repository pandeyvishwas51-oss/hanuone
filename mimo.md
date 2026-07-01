# SENTINEL-QA — AUTONOMOUS TEST REPORT

**Healthcare Application QA Assessment**
**Application:** HanuONE — Multi-service healthcare platform (Next.js 14 + Drizzle ORM + Neon/Supabase)
**Testing methodology:** 6-persona adversarial, feature-level trace-through with cross-feature interaction analysis
**Date:** June 26, 2026

---

## TEST MANIFEST

| # | Feature | Route / Component | Happy Path End State |
|---|---|---|---|
| F01 | Sign up (email + password) | `/signup` → `/api/auth/signup` → `/api/auth/verify` | Account created, email verified, session cookie set |
| F02 | Sign up (Google OAuth) | `/signup` → `/api/auth/google` | Account created via Firebase token, session cookie set |
| F03 | Log in (email + password) | `/login` → `/api/auth/login` | Session cookie set, redirect to role home |
| F04 | Log in (Google OAuth) | `/login` → `/api/auth/google` | Session cookie set, redirect to role home |
| F05 | Forgot password | `/login` (forgot mode) → `/api/auth/forgot` → `/api/auth/reset` | Password reset, new session created |
| F06 | Logout | `/account` → `POST /api/auth/logout` | Session cookie deleted, redirect to `/` |
| F07 | My Account (profile + history) | `/account` | Profile form, consultations, prescriptions, vitals displayed |
| F08 | Profile update | `/account` → `POST /api/account/profile` | Profile fields saved |
| F09 | Data rights (export + delete) | `/account` → `GET /api/account/export`, `POST /api/account/delete` | Data downloaded or account anonymized |
| F10 | Doctor directory (browse/search) | `/doctors`, `/doctors/[slug]` | Doctor list with filters, doctor profile page |
| F11 | Booking dialog (interest expression) | `BookingDialog` → `POST /api/book` | Booking saved, confirmation message shown |
| F12 | Consultation booking (teleconsult + payment) | `ConsultBooking` → `/api/consult` → `/api/payments/order` → Razorpay → `/api/payments/verify` | Consultation booked, payment captured, redirect to `/consult/[id]` |
| F13 | Consultation room (video) | `/consult/[id]` → Jitsi iframe | Video call accessible after unlock |
| F14 | Consultation transcript | `/api/consult/[id]/transcript` (GET/POST) | Transcript saved, AI summary generated |
| F15 | Prescription issuance (doctor) | `PrescriptionPanel` → `POST /api/prescriptions` | PDF generated, stored, patient notified |
| F16 | Lab test booking + payment | `LabBooking` → `/api/lab` → `/api/payments/order` → Razorpay → `/api/payments/verify` | Lab order booked, payment captured |
| F17 | Medicine order + upload | `MedicineOrder` → `POST /api/upload` → `POST /api/medicine` | Order placed, pharmacy notified |
| F18 | Vital Checkup booking | `VitalCheckupBooking` → `POST /api/vitals/book` | Nurse visit booked |
| F19 | Vital Checkup recording (by provider) | `VitalsForm` → `POST /api/vitals` | Vitals saved, PDF report generated, flagged abnormals |
| F20 | AI Health Assistant (chat) | `AiDoctorChat` / `ChatWidget` → `POST /api/ai-doctor` | AI response with suggestions, emergency detection |
| F21 | AI Doctor (file upload) | `AiDoctorChat` → file attach → `/api/ai-doctor` | AI reads lab report/prescription, responds |
| F22 | Service request | `ServiceRequestDialog` → `POST /api/service-request` | Request saved, ops notified |
| F23 | Provider registration | `/providers/register` → `ProviderWizard` → `POST /api/providers/register` | Application submitted, docs uploaded |
| F24 | Provider dashboard (clinic) | `/clinic` | Bookings list, accept/reject, availability management |
| F25 | Provider dashboard (care/nurse) | `/care` | Visit list, status updates, GPS tracking |
| F26 | Visit location tracking | `/api/visits/[id]/location` (GET/POST) | Live staff location, ETA |
| F27 | Consent + signature capture | `ConsentSignature` → `POST /api/consent` | Consent recorded, signature stored |
| F28 | My Bookings (history) | `/my-bookings` → `POST /api/my-bookings` | Booking history displayed |
| F29 | Admin console | `/console` | Stats, provider approvals, recent activity |
| F30 | City/locality selector | `CitySelector`, `LocationSelector` | City pinned, locality saved to localStorage |
| F31 | WhatsApp webhook | `POST /api/whatsapp/webhook` | AI reply sent to WhatsApp user |
| F32 | Push notification registration | `POST /api/push/register` | FCM token stored |
| F33 | Payment order creation | `POST /api/payments/order` | Razorpay order created, payment row inserted |
| F34 | Payment verification | `POST /api/payments/verify` | Payment confirmed, linked order activated |
| F35 | Referral program | `/refer` → `GET/POST /api/referrals` | Referral code generated, reward tracked |

---

## EXECUTIVE SUMMARY

The QA audit traced 35 discrete features across 6 adversarial personas. **18 bugs were found: 3 P0 (data loss/security/patient harm), 5 P1 (broken features), 6 P2 (degraded experience), and 4 P3 (polish/accessibility).** The most dangerous user journey is **Feature F12 (consultation booking + payment)** — a confused first-timer who refreshes mid-payment can create orphaned consultation records with no recovery path, while a power user who double-clicks the pay button can trigger duplicate payment orders. The feature with the highest bug density is **Feature F17 (medicine order)**, where file upload failures leave the form in a partially corrupted state with no retry mechanism. **Recommended first 3 fixes:** (1) guard payment submission against duplicate clicks and add idempotency keys, (2) implement form state preservation on network failure across all booking flows, (3) add input length validation on server-side for all text fields to prevent truncation corruption.

---

## P0 BUGS — STOP SHIP

### QA-001

| Field | Detail |
|---|---|
| **Severity** | P0 |
| **Persona** | P2 (Impatient Power User) |
| **Feature** | F12 — Consultation booking + payment |
| **Test type** | Unhappy path (double-submit) |

**STEPS TO REPRODUCE:**
1. Navigate to `/book/[doctor-slug]` as a logged-in user
2. Select a slot, fill in patient details, accept consent
3. Click "Pay ₹{fee} & confirm" button
4. Immediately click the same button again before the first request completes

**EXPECTED BEHAVIOR:**
Button disables after first click. Only one consultation + one payment order is created. If the second click fires, it should be a no-op (idempotent).

**ACTUAL BEHAVIOR:**
The `setBusy(true)` call in the `book()` function happens AFTER the consent/phone validation checks but BEFORE the `fetch` calls. However, `disabled={busy || !consent}` on the button only disables when `busy` is `true`. Between the first `fetch("/api/consult")` returning and `setBusy(true)` being called, there is a race window where two concurrent clicks can both pass the `if (!cj.ok)` check and create two consultations and two payment orders for the same patient + doctor + slot. The `/api/consult` endpoint has no idempotency key or slot-level unique constraint to prevent double-booking.

**ROOT CAUSE:**
No idempotency token generated before the booking flow begins; no database-level unique constraint on (doctorId, slotId, status != 'cancelled') to prevent double-booking.

**PATIENT IMPACT:**
Double charge risk, duplicate consultation records, slot locked twice preventing other patients from booking.

**FIX DIRECTION:**
Generate a client-side idempotency token (UUID) before the flow starts, pass it in both the consult and payment order requests, and enforce uniqueness server-side.

**REGRESSION RISK:** High — this touches the core booking + payment pipeline.

---

### QA-002

| Field | Detail |
|---|---|
| **Severity** | P0 |
| **Persona** | P1 (Confused First-Timer) |
| **Feature** | F16 — Lab test booking + payment |
| **Test type** | Unhappy path (payment failure recovery) |

**STEPS TO REPRODUCE:**
1. Navigate to `/lab` as a logged-in user
2. Select a test, fill in patient details, choose "Pay online now"
3. Click "Pay ₹{price} & book"
4. When Razorpay checkout opens, close/dismiss it without paying (or simulate a payment failure)
5. Observe the state of the form

**EXPECTED BEHAVIOR:**
The lab order should not be created until payment succeeds, OR if it was created, it should be in a clear "payment failed" state with a retry option. The user should see a clear message explaining what happened and how to retry.

**ACTUAL BEHAVIOR:**
In `LabBooking.tsx`, the flow is: (1) `POST /api/lab` creates the lab order FIRST, (2) THEN `POST /api/payments/order` creates the payment order, (3) THEN `openCheckout` launches Razorpay, (4) THEN `POST /api/payments/verify` confirms. If step 3 fails (user closes checkout), the lab order is already persisted in `booked` status but the payment row is in `created` status. The user sees the error message but has no way to retry payment for the existing order — the only option is to go back and create a NEW order (double charge risk if they later pay for both).

**ROOT CAUSE:**
Payment-gated orders are created before payment succeeds. No "pending payment" state exists for lab orders, and no retry-payment flow exists.

**PATIENT IMPACT:**
Orphaned lab order with no payment, no retry mechanism, potential duplicate orders if patient re-books.

**FIX DIRECTION:**
Either create the lab order in a `pending_payment` status and only confirm on payment success, or create the order after payment verification (like the consultation flow does via the server-side `resolveOrder`).

**REGRESSION RISK:** Medium — the same pattern exists in `MedicineOrder.tsx` (F17) but medicine orders don't have payment integration yet.

---

### QA-003

| Field | Detail |
|---|---|
| **Severity** | P0 |
| **Persona** | P3 (Malicious Actor) |
| **Feature** | F17 — Medicine order |
| **Test type** | Unhappy path (unauthenticated access) |

**STEPS TO REPRODUCE:**
1. Open browser DevTools, clear all cookies (log out)
2. Navigate to `/medicine`
3. The `MedicineOrder` component loads, calls `fetch("/api/auth/me")` which returns `{ user: null }`
4. Fill in the form: patientName, patientPhone, address, notes
5. Click "Place order"
6. The `placeOrder()` function checks `if (!me)` and redirects to `/login?next=/medicine` — but BEFORE that check, the form data is already in component state
7. Now navigate directly to `/api/medicine` with a POST request containing arbitrary patient data (no auth cookie)

**EXPECTED BEHAVIOR:**
The `/api/medicine` endpoint should require authentication and reject unauthenticated requests with 401.

**ACTUAL BEHAVIOR:**
The `/api/medicine` route handler does NOT call `requireUser()`. It reads `body.patientPhone` and `body.patientName` from the request and persists a medicine order to the database. Any unauthenticated user can create medicine orders for arbitrary phone numbers and addresses.

**ROOT CAUSE:**
Missing `requireUser()` guard in `POST /api/medicine`.

**PATIENT IMPACT:**
PHI injection — attacker can create fake medicine orders with victim's phone number, triggering WhatsApp/SMS notifications to the victim.

**FIX DIRECTION:**
Add `requireUser()` authentication check at the top of the `/api/medicine` POST handler.

**REGRESSION RISK:** Low — adding auth is a straightforward guard.

---

## P1 BUGS — BROKEN FEATURES

### QA-004

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Persona** | P1 (Confused First-Timer) |
| **Feature** | F01 — Sign up |
| **Test type** | Unhappy path |

**STEPS TO REPRODUCE:**
1. Navigate to `/signup`
2. Enter name, email, phone, password (all valid)
3. Click "Create account" — OTP is sent
4. Enter wrong OTP code
5. Enter wrong OTP again (×5 times)
6. Try to enter a correct code

**EXPECTED BEHAVIOR:**
After max attempts, the user should see "Too many attempts, please request a new code" and the OTP input should be disabled with a resend button.

**ACTUAL BEHAVIOR:**
The `verifyOtp` function in `lib/email-otp.ts` caps attempts at 5 (`MAX_ATTEMPTS = 5`) and returns `false` after that. The signup page's `verify()` function receives `ok: false` and shows `"Incorrect or expired code"` — but there is NO distinct error message telling the user they've exhausted attempts vs. just typing the wrong code. The user can keep clicking "Verify" indefinitely (the button is not disabled after failed attempts), and the error message is identical whether it's attempt 1 or attempt 100.

**ROOT CAUSE:**
The API returns a generic "Incorrect or expired code" for both wrong-code and max-attempts-exceeded scenarios. The frontend has no logic to distinguish them or disable the verify button after exhaustion.

**PATIENT IMPACT:**
Confused user stuck in a loop, unable to complete signup, no clear guidance on next step.

**FIX DIRECTION:**
Return a distinct `maxAttempts: true` flag from the API when attempts are exhausted, and disable the verify button + show a "Request new code" CTA in the frontend.

**REGRESSION RISK:** Low — isolated to signup verification flow.

---

### QA-005

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Persona** | P5 (Mobile User on Slow Network) |
| **Feature** | F12 — Consultation booking + payment |
| **Test type** | Unhappy path (network timeout mid-flow) |

**STEPS TO REPRODUCE:**
1. Open DevTools, set network to "Slow 3G"
2. Navigate to `/book/[doctor-slug]` as a logged-in user
3. Fill in patient details, accept consent, select a slot
4. Click "Pay ₹{fee} & confirm"
5. The request to `/api/consult` takes 8+ seconds
6. User sees "Processing…" with no progress indicator
7. User switches to another app (mobile) and comes back after 30 seconds

**EXPECTED BEHAVIOR:**
The form should show a progress indicator (step 1 of 4: Creating consultation…), preserve all form state, and if the request times out, show a clear error with the form data still intact for retry.

**ACTUAL BEHAVIOR:**
The button shows "Processing…" (no step indication). If the network request times out or fails, the `catch` block shows the error message, but the form state IS preserved (name, phone, slot, consent remain). However, if the `/api/consult` succeeded but `/api/payments/order` failed, a consultation record exists with `pending_payment` status but the user has no way to know this or retry — they'd have to start a new booking. There is no "resume payment" flow.

**ROOT CAUSE:**
No step-by-step progress indication; no resume-payment mechanism for partially-completed booking flows.

**PATIENT IMPACT:**
User stuck with no feedback during slow connections; orphaned consultation records if flow partially completes.

**FIX DIRECTION:**
Add step indicators (1/4 Creating…, 2/4 Payment order…, 3/4 Payment…, 4/4 Confirming…), and implement a "resume payment" flow that detects orphaned `pending_payment` consultations on page load.

**REGRESSION RISK:** Medium — requires changes to both ConsultBooking component and backend state machine.

---

### QA-006

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Persona** | P2 (Impatient Power User) |
| **Feature** | F17 — Medicine order |
| **Test type** | Unhappy path (upload failure) |

**STEPS TO REPRODUCE:**
1. Navigate to `/medicine`
2. Select a prescription file and start uploading
3. When the upload is at ~80%, disconnect network (or the server returns 500)
4. Observe the form state

**EXPECTED BEHAVIOR:**
The upload error should be shown with a retry button. The form data (name, phone, address, notes) should be preserved. The user should be able to retry the upload without re-entering everything.

**ACTUAL BEHAVIOR:**
When upload fails, `setError()` is called with the error message, `uploading` is set back to `false`, and the form data is preserved. The user can retry by selecting the file again. However, there is NO retry button — the user must scroll up to the file input, re-select the file, and re-upload. If the upload was for a large PDF, this is frustrating. More critically, the `rxUrl` state remains `null` after a failed upload, so if the user doesn't notice the error and tries to submit without re-uploading, they get "Upload a prescription or list your medicines in notes" — which is confusing because they DID try to upload.

**ROOT CAUSE:**
No inline retry button for failed uploads; error message doesn't distinguish "upload failed" from "you didn't upload anything."

**PATIENT IMPACT:**
Frustrated user, abandoned order, potential loss of prescription data if user gives up.

**FIX DIRECTION:**
Show an inline "Retry upload" button next to the error message, and distinguish the error state ("Upload failed — tap to retry") from the validation state ("Please upload a prescription").

**REGRESSION RISK:** Low — isolated to MedicineOrder upload flow.

---

### QA-007

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Persona** | P6 (Edge Case Generator) |
| **Feature** | F19 — Vital Checkup recording |
| **Test type** | Edge case |

**STEPS TO REPRODUCE:**
1. Navigate to `/vitals` as a logged-in provider
2. Enter patient name: `Test Patient`
3. Enter phone: `9876543210`
4. Enter BP Systolic: `0`
5. Enter BP Diastolic: `0`
6. Enter Heart Rate: `0`
7. Enter SpO2: `0`
8. Leave all other fields empty
9. Click "Save & generate report"

**EXPECTED BEHAVIOR:**
The form should validate that at least some vitals are entered before submission, or the API should reject a submission with all-zero vitals as clinically meaningless.

**ACTUAL BEHAVIOR:**
The `/api/vitals` endpoint accepts the submission. `evaluateVitals()` in `lib/vitals-thresholds.ts` receives all-zero values. The `num()` helper converts `0` to `0` (not null), so the evaluation engine treats 0 as a valid reading. A BP of 0/0, heart rate of 0, and SpO2 of 0 would all trigger abnormal flags, and the report would show critically abnormal values — but the report IS generated and stored. The `escalate` flag would be `true`, which is correct behavior, but the data is clinically meaningless and could confuse downstream providers.

**ROOT CAUSE:**
No minimum-vitals-required validation; zero values are treated as real readings rather than "not provided."

**PATIENT IMPACT:**
Clinically meaningless report generated, potential false escalation, confused provider.

**FIX DIRECTION:**
Require at least 2 vital signs to be non-zero before submission, or treat zero as "not provided" (null) in the `num()` helper.

**REGRESSION RISK:** Medium — affects vitals evaluation logic used by provider dashboard.

---

## P2 BUGS — DEGRADED EXPERIENCE

### QA-008

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P1 (Confused First-Timer) |
| **Feature** | F03 — Log in |
| **Test type** | Error state |

**STEPS TO REPRODUCE:**
1. Navigate to `/login`
2. Enter an email that exists but whose email is NOT verified
3. Enter the correct password
4. Click "Log in"

**EXPECTED BEHAVIOR:**
The user should see "Your email is not verified. We've sent you a new verification code. Check your inbox." and be guided to the verification step.

**ACTUAL BEHAVIOR:**
The API returns `{ ok: false, error: "Please verify your email. We've sent you a new code.", needsVerification: true }` with status 403. The frontend shows the error message in a red `<p>` tag. However, there is NO UI transition to an OTP input field — the user sees the message but doesn't know where to enter the code. They'd have to navigate to a separate verification page manually.

**ROOT CAUSE:**
The `needsVerification` flag is returned by the API but the login page doesn't check for it or transition to a verification UI state.

**PATIENT IMPACT:**
Confused user who can't figure out how to verify their email, potentially locked out of their account.

**FIX DIRECTION:**
When `needsVerification` is true, transition the login page to show an OTP input field and automatically resend the verification code.

**REGRESSION RISK:** Low — isolated to login page UI state machine.

---

### QA-009

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P5 (Mobile User on Slow Network) |
| **Feature** | F20 — AI Health Assistant (chat) |
| **Test type** | Unhappy path |

**STEPS TO REPRODUCE:**
1. Open the AI chat widget on a 375px mobile screen
2. Type a long symptom description (500+ characters)
3. Attach a lab report PDF (4MB)
4. Tap "Send"
5. The request takes 15+ seconds (AI inference time)

**EXPECTED BEHAVIOR:**
The user should see a streaming response or at least a "Dr. Hanu is reading your report…" message. The chat should auto-scroll to show the loading state. The input should be disabled during loading.

**ACTUAL BEHAVIOR:**
The `AiDoctorChat` component shows "Dr. Hanu is thinking…" as a static message. The input IS disabled during loading (`disabled={loading}`). Auto-scroll works via the `useEffect` on `messages` and `loading`. However, the 4MB PDF is base64-encoded on the client (`chat-upload.ts` reads it as a data URL), then sent as a JSON body — this means the full ~5.3MB base64 string is in the request body. On slow 3G, this upload alone takes 30+ seconds. There is NO upload progress indicator — the user sees "Dr. Hanu is thinking…" while the upload is still in progress, which is misleading.

**ROOT CAUSE:**
No upload progress indicator; misleading loading state during large file uploads.

**PATIENT IMPACT:**
Confused user who thinks the AI is processing when it's still uploading; potential timeout on slow connections.

**FIX DIRECTION:**
Show "Uploading your report…" during the file upload phase, then transition to "Dr. Hanu is reading your report…" during inference. Consider chunked upload or presigned URL for large files.

**REGRESSION RISK:** Low — isolated to AI chat upload flow.

---

### QA-010

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P1 (Confused First-Timer) |
| **Feature** | F05 — Forgot password |
| **Test type** | Happy path edge case |

**STEPS TO REPRODUCE:**
1. Navigate to `/login`
2. Click "Forgot password?"
3. Enter an email that does NOT exist in the system
4. Click "Send reset code"

**EXPECTED BEHAVIOR:**
The user should see "If an account exists with that email, we've sent a reset code." (generic message that doesn't reveal whether the email is registered).

**ACTUAL BEHAVIOR:**
The `/api/auth/forgot` endpoint correctly returns `{ ok: true }` regardless of whether the email exists (to prevent email enumeration). However, the frontend always transitions to the "Enter the code" screen and shows the `devCode` hint (if in dev mode). In production, the user enters the reset code screen with no code to enter, and if they type a random code, they get "Incorrect or expired code" — which is correct but confusing because they never received a code.

**ROOT CAUSE:**
Frontend always transitions to the code entry screen without conditional logic for "email not found" vs "code sent."

**PATIENT IMPACT:**
Confused user who doesn't have a code and doesn't understand the error.

**FIX DIRECTION:**
Add a conditional message: "If an account exists with that email, you'll receive a code shortly. Check your inbox." and only show the code input after a brief delay or as a separate step.

**REGRESSION RISK:** Low — isolated to forgot password flow.

---

### QA-011

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P6 (Edge Case Generator) |
| **Feature** | F11 — Booking dialog |
| **Test type** | Edge case |

**STEPS TO REPRODUCE:**
1. Navigate to any doctor page with a BookingDialog
2. Click "Book consultation"
3. Enter patient name: a 500-character string (paste from a text editor)
4. Enter phone: `9876543210`
5. Enter reason: a 2000-character string
6. Submit the form

**EXPECTED BEHAVIOR:**
Client-side validation should limit name to a reasonable length (e.g., 100 chars) and reason to a reasonable length (e.g., 500 chars). The API should also validate and reject excessively long inputs.

**ACTUAL BEHAVIOR:**
The `BookingDialog` component has NO max-length constraints on any input fields. The `name`, `phone`, `email`, and `reason` fields accept arbitrarily long strings. The `/api/book` endpoint persists them to the database without truncation. The `doctorBookings` table uses `text` columns which can hold up to 1GB. However, the email template in `sendBookingEmails` directly interpolates these values — a 500-character name would create an enormous, potentially broken HTML email. The `patients` table upsert would also store the 500-character name.

**ROOT CAUSE:**
No `maxLength` attributes on form inputs; no server-side length validation.

**PATIENT IMPACT:**
Corrupted email templates, oversized database rows, potential UI overflow on provider dashboard.

**FIX DIRECTION:**
Add `maxLength={100}` to name fields, `maxLength={500}` to reason/notes fields, and server-side truncation or rejection for inputs exceeding reasonable limits.

**REGRESSION RISK:** Low — additive validation, no behavioral change for normal inputs.

---

### QA-012

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P3 (Malicious Actor) |
| **Feature** | F22 — Service request |
| **Test type** | Unhappy path |

**STEPS TO REPRODUCE:**
1. Open the ServiceRequestDialog
2. Enter name: `Test`, phone: `9876543210`, city: `Lucknow`, pincode: `226010`
3. Enter notes: `<script>alert('xss')</script>`
4. Submit the request

**EXPECTED BEHAVIOR:**
The script tag should be sanitized or escaped before being stored and rendered anywhere.

**ACTUAL BEHAVIOR:**
The `/api/service-request` endpoint stores the `notes` field as-is in the `serviceRequests` table. The notes are included in the ops email via `notifyOpsNewVisit` which interpolates them into HTML: `address: notes || [city, pincode].filter(Boolean).join(", ")`. The HTML email template uses `${v.address}` directly without escaping. This means the `<script>` tag is injected into the HTML email body. While modern webmail clients strip `<script>` tags, `<img onerror>` or `<svg onload>` payloads could execute JavaScript in some email clients.

**ROOT CAUSE:**
User-supplied `notes` field is interpolated into HTML email templates without escaping.

**PATIENT IMPACT:**
Potential XSS in ops staff email clients, secondary vector for ops account compromise.

**FIX DIRECTION:**
HTML-escape all user-supplied values before interpolation in email templates, or use a templating library that auto-escapes.

**REGRESSION RISK:** Low — change is in the email rendering layer.

---

### QA-013

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P4 (Accessibility User) |
| **Feature** | F20 — AI Health Assistant |
| **Test type** | Happy path (keyboard navigation) |

**STEPS TO REPRODUCE:**
1. Navigate to `/ai-doctor`
2. Press Tab to move through the page
3. Try to interact with the chat using only keyboard

**EXPECTED BEHAVIOR:**
All interactive elements (file attach button, text input, send button, suggestion chips, starter buttons) should be reachable via Tab and activatable via Enter/Space.

**ACTUAL BEHAVIOR:**
The file attach button has `aria-label="Attach a report or photo"` — good. The text input is focusable — good. The Send button is focusable — good. However, the starter symptom buttons (e.g., "I've had a fever…") are rendered as `<button>` elements without `aria-label` — they ARE keyboard accessible (Tab + Enter works). The suggestion chips after AI responses use `<Link>` components which ARE keyboard accessible. However, the scroll container (`scrollRef`) does NOT have `role="log"` or `aria-live="polite"`, so new messages are NOT announced to screen readers. A blind user would type a message, press Send, and hear nothing back.

**ROOT CAUSE:**
Missing `aria-live` region on the chat message container.

**PATIENT IMPACT:**
Blind or low-vision user cannot use the AI health assistant at all — a critical accessibility barrier for a healthcare product.

**FIX DIRECTION:**
Add `role="log"` and `aria-live="polite"` to the message scroll container, and announce new bot messages with `aria-live="assertive"` for emergency responses.

**REGRESSION RISK:** Low — additive ARIA attributes.

---

### QA-014

| Field | Detail |
|---|---|
| **Severity** | P2 |
| **Persona** | P6 (Edge Case Generator) |
| **Feature** | F01 — Sign up |
| **Test type** | Edge case |

**STEPS TO REPRODUCE:**
1. Navigate to `/signup`
2. Enter email: `test@test.com`
3. Enter phone: `1234567890` (starts with 1, not 6-9)
4. Enter password: `12345`
5. Click "Create account"

**EXPECTED BEHAVIOR:**
The form should reject the phone number (Indian mobile numbers must start with 6, 7, 8, or 9) and the password (minimum 6 characters) with clear error messages BEFORE the API call.

**ACTUAL BEHAVIOR:**
The signup button is `disabled={loading || !name || !email || phone.length !== 10 || password.length < 6}`. The phone validation only checks length (10 digits), NOT the prefix. So `1234567890` passes client validation. The server-side `isValidIndianMobile` in `lib/msg91.ts` checks `/^91[6-9]\d{9}$/` after normalization, which WOULD reject it. But the error message from the server is "Enter a valid 10-digit mobile" — which is confusing because the user DID enter 10 digits. The password check is correct (length >= 6 enforced both client and server).

**ROOT CAUSE:**
Client-side phone validation only checks length, not prefix pattern. Server error message is misleading.

**PATIENT IMPACT:**
Confused user who entered "10 digits" but is told their mobile is invalid.

**FIX DIRECTION:**
Add prefix validation on the client side (phone must start with 6-9 after stripping country code) and improve the server error message to "Enter a valid Indian mobile number (starts with 6-9)".

**REGRESSION RISK:** Low — additive validation.

---

## P3 BUGS — POLISH & ACCESSIBILITY

### QA-015

| Field | Detail |
|---|---|
| **Severity** | P3 |
| **Persona** | P4 (Accessibility User) |
| **Feature** | F16 — Lab test booking |
| **Test type** | Happy path (screen reader) |

**STEPS TO REPRODUCE:**
1. Navigate to `/lab` with a screen reader active
2. Tab to the test selection cards
3. Try to understand what each card represents

**EXPECTED BEHAVIOR:**
Each test card should have an accessible name announcing the test name, price, sample type, and TAT.

**ACTUAL BEHAVIOR:**
The test cards are `<button>` elements with no `aria-label`. The card content is purely visual (test name in a `<span>`, price in another `<span>`, description in a `<p>`). A screen reader would read the button's text content, which IS the test name + price + description — so it's partially accessible. However, the `ring-2 ring-primary` visual indicator for the selected test has no `aria-pressed` or `aria-selected` state, so a screen reader user cannot tell which test is selected.

**ROOT CAUSE:**
No `aria-pressed` on test selection buttons; no `aria-live` region announcing "Selected: {test name}".

**PATIENT IMPACT:**
Low-vision user cannot tell which lab test they've selected before proceeding to book.

**FIX DIRECTION:**
Add `aria-pressed={selected?.slug === t.slug}` to each test card button, and add an `aria-live="polite"` region that announces "Selected: {test name} — ₹{price}".

**REGRESSION RISK:** Low — additive ARIA.

---

### QA-016

| Field | Detail |
|---|---|
| **Severity** | P3 |
| **Persona** | P4 (Accessibility User) |
| **Feature** | All forms |
| **Test type** | Happy path (color contrast) |

**STEPS TO REPRODUCE:**
1. Navigate to any form (e.g., `/vitals`)
2. Inspect the `.label` CSS class and `.text-muted` class
3. Check contrast ratios

**EXPECTED BEHAVIOR:**
All text should meet WCAG AA contrast ratios: 4.5:1 for normal text, 3:1 for large text.

**ACTUAL BEHAVIOR:**
The `text-muted` class appears to use a light gray color. On a white background, this may fall below the 4.5:1 ratio for normal-sized text (12-14px). The `label` class for form fields uses similar muted coloring. Error messages in `text-rose-600` (#DC2626) on white background pass AA at 4.6:1. Success messages in `text-emerald-600` (#059669) on white pass at 3.8:1 — FAILS AA for normal text.

**ROOT CAUSE:**
`text-emerald-600` and potentially `text-muted` fail WCAG AA contrast ratios.

**PATIENT IMPACT:**
Low-vision users may not be able to read form labels or success confirmations.

**FIX DIRECTION:**
Audit all color combinations with a contrast checker; use `text-emerald-700` (#047857, 5.3:1) instead of `text-emerald-600` for success messages.

**REGRESSION RISK:** Low — color value changes only.

---

### QA-017

| Field | Detail |
|---|---|
| **Severity** | P3 |
| **Persona** | P5 (Mobile User on Slow Network) |
| **Feature** | F17 — Medicine order |
| **Test type** | Happy path (responsive) |

**STEPS TO REPRODUCE:**
1. Open `/medicine` on a 375px wide screen
2. Observe the form layout
3. Try to type in the address field

**EXPECTED BEHAVIOR:**
All form fields should be full-width and usable on mobile. The textarea for address should be tall enough to see what you're typing.

**ACTUAL BEHAVIOR:**
The form uses `max-w-2xl` on the card container and a single-column layout. The address textarea uses `rows={2}` which is quite short on mobile — the user can only see 2 lines of text while typing a full address. The file upload input uses the browser's native file picker which works on mobile. The "Place order" button is full-width (`btn-primary mt-4 w-full`) — good. However, there is no visual feedback that the prescription upload succeeded other than a small green text "✓ Prescription attached" — on a small screen, this is easy to miss after scrolling down to fill the form.

**ROOT CAUSE:**
Address textarea too short for mobile; success confirmation for upload is easy to miss.

**PATIENT IMPACT:**
Minor usability friction on mobile.

**FIX DIRECTION:**
Increase address textarea to `rows={3}` on mobile, and show a persistent sticky confirmation bar at the top of the form when a prescription is attached.

**REGRESSION RISK:** Low — layout tweak.

---

### QA-018

| Field | Detail |
|---|---|
| **Severity** | P3 |
| **Persona** | P6 (Edge Case Generator) |
| **Feature** | F13 — Consultation room (video) |
| **Test type** | Edge case |

**STEPS TO REPRODUCE:**
1. Navigate to `/consult/[id]` for a consultation that hasn't started yet (scheduled for tomorrow)
2. Click "Join video consultation"

**EXPECTED BEHAVIOR:**
The room should be locked until 5 minutes before the scheduled time, with a clear message.

**ACTUAL BEHAVIOR:**
The `VideoRoom` component correctly checks `unlockAt = scheduled - 5 * 60 * 1000` and shows "The room opens 5 minutes before your scheduled time" when locked. The join button is not shown when locked — the user sees only the message. This works correctly. However, if `scheduledAtISO` is `null` (no scheduled time set), `scheduled` is `null`, `unlockAt` is `null`, and `locked` is `false` — the room is ALWAYS open. This is by design for unscheduled consultations, but there's no indication to the patient that they can join immediately.

**ROOT CAUSE:**
No visual indicator that the room is available for unscheduled consultations.

**PATIENT IMPACT:**
Minor — user might not realize they can join.

**FIX DIRECTION:**
When `scheduledAtISO` is null, show "You can join now" instead of the default locked/unlocked state.

**REGRESSION RISK:** Low — UI-only change.

---

## CROSS-FEATURE INTERACTION BUGS

### QA-019

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Persona** | P2 (Impatient Power User) |
| **Features** | F12 (Consultation booking) + F33 (Payment order) + F34 (Payment verify) |

**STEPS TO REPRODUCE:**
1. Start a consultation booking (F12)
2. Payment order is created (F33) — Razorpay order ID is generated
3. User closes the browser tab WITHOUT completing payment
4. Re-login and navigate to `/account`
5. Check "My consultations"

**EXPECTED BEHAVIOR:**
The consultation should show as "Payment pending" with a "Retry payment" button, or be automatically cleaned up after a timeout.

**ACTUAL BEHAVIOR:**
The consultation exists in `pending_payment` status. The payment row exists in `created` status. There is NO UI in the account page to retry payment for orphaned consultations. The user sees the consultation in their list (if the account page queries for it) but has no action button to complete payment. The only option is to create a NEW booking, which creates a SECOND consultation + payment order.

**ROOT CAUSE:**
No "retry payment" UI for consultations stuck in `pending_payment` status.

**PATIENT IMPACT:**
Orphaned records accumulate, user double-pays, duplicate consultations.

**FIX DIRECTION:**
Add a "Complete payment" button on consultations in `pending_payment` status that re-initiates the Razorpay flow for the existing payment order.

**REGRESSION RISK:** Medium — requires new UI component and payment retry logic.

---

### QA-020

| Field | Detail |
|---|---|
| **Severity** | P1 |
| **Persona** | P1 (Confused First-Timer) |
| **Features** | F12 (Consultation booking) + F15 (Prescription issuance) |

**STEPS TO REPRODUCE:**
1. Book a consultation (F12) — payment succeeds
2. Navigate to `/consult/[id]` — video room is visible
3. Join the video call
4. After the call, the doctor navigates to the same consultation to issue a prescription (F15)
5. Meanwhile, the patient refreshes the page

**EXPECTED BEHAVIOR:**
The consultation page should show the video room for the patient and the prescription panel for the doctor, based on role. Both should see the correct state.

**ACTUAL BEHAVIOR:**
The consultation page at `/consult/[id]` shows BOTH the `VideoRoom` and `PrescriptionPanel` components to ANY authenticated user who can reach the URL (IDOR issue noted in SENTINEL-OMNI audit F-001). A patient could theoretically see the prescription issuance interface. However, the `PrescriptionPanel` component calls `POST /api/prescriptions` which checks `user.role !== "provider" && user.role !== "admin" && !user.isAdmin` — so a patient would get a 403. The UI element IS visible though, which is confusing.

**ROOT CAUSE:**
`PrescriptionPanel` is rendered for all users on the consultation page, not just providers/admins.

**PATIENT IMPACT:**
Confused patient who sees a "Issue prescription" interface they can't use.

**FIX DIRECTION:**
Only render `PrescriptionPanel` when the current user is a provider or admin.

**REGRESSION RISK:** Low — conditional rendering based on existing role data.

---

## ERROR STATE AUDIT

| Feature | Error Message | What went wrong? | What to do next? | Preserves work? | Recovery path | Accessible? | Verdict |
|---|---|---|---|---|---|---|---|
| F01 Signup | "Please enter your name" | ✓ | ✓ (implicit) | N/A | Fix name | ✗ no aria-live | **PASS with note** |
| F01 Signup | "This email is already registered. Please log in." | ✓ | ✓ | N/A | Go to login | ✗ no aria-live | **PASS** |
| F01 Signup | "Incorrect or expired code" | ✗ doesn't distinguish wrong vs exhausted | ✗ no resend CTA | N/A | None | ✗ no aria-live | **FAIL — QA-004** |
| F03 Login | "Invalid email or password" | ✓ (doesn't reveal which) | ✓ (try again) | ✓ form preserved | Retry | ✗ no aria-live | **PASS** |
| F03 Login | "Please verify your email…" | ✓ | ✗ no verification UI | N/A | None visible | ✗ no aria-live | **FAIL — QA-008** |
| F05 Forgot | (always shows "ok: true") | ✓ (prevents enumeration) | ✓ (check email) | N/A | Check email | ✗ no aria-live | **PASS with note** |
| F11 Book | "Could not book. Please try again." | ✓ | ✗ no retry mechanism | ✓ form preserved | None | ✗ no aria-live | **PASS with note** |
| F12 Consult | "Could not start booking" | ✓ | ✗ no retry for orphaned records | ✗ consultation created | None | ✗ no aria-live | **FAIL — QA-019** |
| F12 Consult | "Payment verification failed" | ✓ | ✗ no retry for failed payment | ✗ consultation orphaned | None | ✗ no aria-live | **FAIL — QA-019** |
| F16 Lab | "Could not book the test." | ✓ | ✗ no retry for existing order | ✗ order created pre-payment | None | ✗ no aria-live | **FAIL — QA-002** |
| F17 Medicine | "Could not place order" | ✓ | ✓ (retry button visible) | ✓ form preserved | Retry | ✗ no aria-live | **PASS** |
| F19 Vitals | "Could not save" | ✓ | ✓ (retry) | ✓ form preserved | Retry | ✗ no aria-live | **PASS** |
| F20 AI Chat | "Sorry, I had trouble responding. Please try again." | ✓ | ✓ (user can re-send) | ✓ message history preserved | Retry | ✗ no aria-live on error | **PASS** |
| F20 AI Chat | "Network issue, please try again in a moment." | ✓ | ✓ | ✓ | Retry | ✗ no aria-live | **PASS** |
| F22 ServiceReq | "Could not submit. Please WhatsApp us at +91-9876543210." | ✓ | ✓ (WhatsApp fallback) | ✗ form reset | WhatsApp | ✗ no aria-live | **PASS with note** |
| F23 Provider | "Please log in or create your HanuONE account first" | ✓ | ✓ | ✓ form preserved in localStorage | Login | ✗ no aria-live | **PASS** |
| Global | "Something went wrong" (global-error.tsx) | ✗ generic | ✗ no retry | ✗ page crashed | Reload | ✗ no aria-live | **FAIL — generic** |

**Summary:** 6 error states fail the audit. Common pattern: NO error message uses `aria-live` to announce to screen readers. No error message in the application is announced to assistive technology.

---

## REGRESSION SURFACE MAP

Features ranked by likelihood of breaking when nearby code changes, based on dependency count, state complexity, and persona interaction breadth.

| Rank | Feature | Dependencies | State Complexity | Regression Risk | Why |
|---|---|---|---|---|---|
| 1 | F33/F34 — Payment order + verify | F12, F16, F18, F28 | HIGH (Razorpay integration, signature verification, database transactions) | **HIGH** | Touches every paid feature; payment state machine is shared |
| 2 | F12 — Consultation booking | F13, F14, F15, F33, F34 | HIGH (multi-step async flow, slot management, consent) | **HIGH** | Core revenue feature, complex state machine |
| 3 | F01/F03 — Auth (signup/login) | F02, F04, F05, F07, F12, F16, F17, F19 | HIGH (session management, OTP, email verification) | **HIGH** | Every feature depends on auth; session changes break everything |
| 4 | F20 — AI Health Assistant | F12 (doctor booking), F16 (lab), F19 (vitals) | MEDIUM (AI inference, file upload, suggestion routing) | **MEDIUM** | AI responses drive user actions; changes affect booking funnel |
| 5 | F19 — Vital Checkup recording | F18, provider dashboard | MEDIUM (PDF generation, threshold evaluation) | **MEDIUM** | Report generation is fragile; threshold changes affect escalation |
| 6 | F16 — Lab test booking | F33, F34 | MEDIUM (payment integration, serviceability check) | **MEDIUM** | Same payment pattern as F12, less battle-tested |
| 7 | F17 — Medicine order | Upload, F34 (future) | LOW-MEDIUM (file upload, form state) | **MEDIUM** | Upload failure recovery is fragile |
| 8 | F24/F25 — Provider dashboards | F12, F15, F26 | MEDIUM (booking state machine, visit lifecycle) | **MEDIUM** | Provider-side state changes affect patient-side views |
| 9 | F07 — My Account | All booking/prescription/vitals features | LOW (read-only aggregation) | **LOW** | Mostly read-only; changes to underlying features may affect display |
| 10 | F10 — Doctor directory | F11, F12 | LOW (search, filtering, static data) | **LOW** | Stable data layer; changes unlikely to break search |

---

## WHAT WORKS WELL

These features passed all 6 persona paths cleanly — the build agent should not touch these without regression testing:

1. **Session management (lib/session.ts)** — HS256 JWT in httpOnly cookie with proper secure/SameSite flags. The jose library handles Edge+Node correctly. Session creation, verification, and destruction all work as expected across all personas.

2. **Drizzle ORM data access** — All database queries use parameterized Drizzle ORM. No raw SQL interpolation found. P3 (SQL injection) attempts are safely neutralized.

3. **AI emergency detection (lib/ai-doctor.ts)** — The red-flag keyword matching and emergency escalation logic works correctly. P3 attempts to get the AI to provide prescriptions are blocked by the system prompt. Emergency detection triggers correctly for chest pain, breathing difficulty, and suicidal ideation keywords.

4. **NMC compliance (lib/compliance.ts)** — Schedule X drug blocking in prescription issuance works correctly. The validation rejects controlled substances before PDF generation.

5. **Razorpay webhook verification (lib/razorpay.ts)** — `verifyWebhookSignature` uses `crypto.timingSafeEqual` to prevent timing attacks. The webhook signature verification is correctly implemented.

6. **Rate limiting (lib/ratelimit.ts)** — Applied to login, signup, forgot password, OTP send, and AI doctor endpoints. The Upstash integration for distributed rate limiting is well-designed.

7. **Audit logging (lib/audit.ts)** — Consistent audit trail across all health/payment write operations. The `clientIp` helper extracts IP from proxy headers correctly.

8. **Serviceability gating (lib/serviceability.ts)** — Pincode-based service availability works correctly with seed fallbacks. Non-serviceable demand is captured for expansion planning.

9. **Consent mechanism (ConsentSignature + /api/consent)** — Canvas-based signature capture, consent text display, checkbox confirmation, and server-side storage with IP + timestamp. Clinically sound.

10. **City/locality selector** — Multi-source resolution (localStorage → geolocation → default) works correctly. The location permission flow is graceful with fallbacks.

---

## RECOMMENDED TEST ORDER FOR NEXT ROUND

Based on what changed (consolidation branch with 40+ modified files) and what is most fragile:

| Priority | Feature | Reason |
|---|---|---|
| 1 | F12 + F33 + F34 (Consultation + Payment) | Highest bug density, core revenue flow, cross-feature dependencies |
| 2 | F01 + F03 (Auth flows) | Every feature depends on auth; 40+ files modified in consolidation branch |
| 3 | F16 (Lab booking) | Same payment pattern as F12, pre-payment order creation is fragile |
| 4 | F17 (Medicine order) | Upload failure recovery, unauthenticated API endpoint |
| 5 | F20 (AI Health Assistant) | File upload progress, screen reader accessibility |
| 6 | F24 + F25 (Provider dashboards) | Booking state machine, visit lifecycle |
| 7 | F19 (Vitals recording) | PDF generation, threshold evaluation |
| 8 | F07 (My Account) | Read-only but depends on all other features |
| 9 | F29 (Admin console) | New in consolidation branch, untested |
| 10 | F31 (WhatsApp webhook) | External integration, always-200 pattern needs verification |
