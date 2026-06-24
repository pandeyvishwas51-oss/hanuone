# HANUone — Low-Level Design (LLD)

**Version:** 1.0 · **Date:** 2026-06-24
Companion to [HLD.md](./HLD.md). This is the implementation contract: data model, API shapes,
auth internals, and module specs. File paths are relative to repo root.

---

## 1. Data model (Drizzle — `lib/db/schema.ts`)

### Existing (kept)
`doctors, specializations, localities, reviews, waitlist, doctor_bookings, service_requests,
patients, professionals, availability, bookings, earnings`

### Auth (evolved `users`)
```
users(id, phone UNIQUE, phone_verified, name, email UNIQUE, email_verified,
      image, password_hash, role['patient'|'provider'|'admin'], is_admin, created_at)
```
NextAuth tables (`accounts, sessions, verification_tokens`) are **dropped** — sessions are
stateless signed cookies.

### New (transacting MVP) — see schema.ts for full columns
- `provider_slots(doctor_id, date, start_time, end_time, mode, fee_inr, is_booked)`
- `consents(user_id, consultation_id, type, granted, consent_text, patient_identity, rmp_identity, mode, ip, ua, created_at)`
- `consultations(doctor_id, patient_user_id, slot_id, patient_name, patient_phone, mode, scheduled_at, status, context, evaluation_notes, management_plan, video_room, fee_inr, consent_id)`
- `prescriptions(consultation_id, doctor_id, patient_user_id, doctor_name, nmc_reg_no, qualification, diagnosis, medications(JSON), instructions, pdf_url, is_follow_up, valid_until)`
- `payments(user_id, order_type, order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount_inr, currency, status, refund_id)`
- `vital_visits(patient_user_id, patient_name, patient_phone, reason, allergies, current_meds, history, bp_systolic, bp_diastolic, heart_rate, spo2, temperature_c, random_blood_sugar, weight_kg, height_cm, respiratory_rate, pain_scale, flags(JSON), provider_notes, report_pdf_url, escalated, visited_at)`
- `audit_logs(actor_user_id, actor_role, action, entity, entity_id, meta(JSON), ip, created_at)`

**Consultation status machine:**
`pending_payment → booked → doctor_accepted → in_progress → completed`
with branches `→ cancelled`, `→ reassigned`, `→ refunded`.

---

## 2. Auth (MSG91 OTP + signed session)

### Files
- `lib/msg91.ts` — `sendOtp(phone)`, `verifyOtp(phone, otp)`, `resendOtp(phone)`, `sendSms(phone, msg)`, `sendWhatsapp(...)`.
- `lib/session.ts` — `createSession(user)`, `getSession()`, `destroySession()` using `jose` HS256 JWT in httpOnly cookie `ho_session`.
- `lib/auth.ts` — `getCurrentUser()`, `requireUser()`, `requireRole(role)`, `requireAdmin()` for RSC + route handlers.

### MSG91 contract (Widget/OTP API)
```
POST https://control.msg91.com/api/v5/otp           ?template_id&mobile=91XXXXXXXXXX   → {request_id}
POST https://control.msg91.com/api/v5/otp/verify     ?otp&mobile                        → {type:'success'}
POST https://control.msg91.com/api/v5/otp/retry      ?mobile&retrytype=text|voice
Header: authkey: $MSG91_AUTH_KEY
```
Dev fallback: if `MSG91_AUTH_KEY` unset → accept OTP `000000` and log (never in prod).

### Endpoints
| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/api/auth/otp/send` | `{phone, role?}` | `{ok, requestId}` |
| POST | `/api/auth/otp/verify` | `{phone, otp, name?}` | `{ok, user}` + sets cookie |
| POST | `/api/auth/logout` | — | `{ok}` clears cookie |

On verify: upsert `users` by phone → set `phone_verified` → if `role=provider` ensure `professionals` row → `createSession`.

### Session token claims
`{ sub: userId, phone, role, isAdmin, iat, exp(1h) }` signed with `AUTH_SECRET`.

---

## 3. Booking + payments

### Slots — `/api/slots`
- `GET /api/slots?doctorSlug=&date=` → available `provider_slots`.
- Provider publishes via `/pro/availability` (reuses existing availability UI).

### Consult booking — `/api/consult`
- `POST /api/consult` `{doctorSlug, slotId, patientName, patientPhone, mode, context, consent:true}`
  1. requireUser. Reject if `consent !== true` (NMC hard gate).
  2. Insert `consents` (telemedicine) + audit.
  3. Insert `consultations(status=pending_payment)`, attach `consent_id`, `video_room = ho-<shortid>`.
  4. Return `{consultationId, feeInr}`.

### Razorpay — `/api/payments/*`
- `POST /api/payments/order` `{orderType, orderId, amountInr}` → server creates Razorpay order (`amount*100`) → `{razorpayOrderId, keyId}`; insert `payments(status=created)`.
- `POST /api/payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` →
  HMAC-SHA256 verify with `RAZORPAY_KEY_SECRET`. On success: `payments.status=paid`; if consultation → `status=booked`, mark slot booked, fire MSG91 + email confirm; audit.
- `POST /api/payments/webhook` — Razorpay webhook (signature header) for async refund/capture.

### Doctor fallback (PRD §5.2.3)
- On booking, set accept deadline = now+5m. A check (cron/edge or on-join) reassigns to next
  same-specialty doctor with an open slot; if none in 10m → auto-refund + notify + audit.

---

## 4. Video — Jitsi
- `videoRoom` = `ho-<nanoid>` stored on consultation.
- Patient/doctor join `https://meet.jit.si/<videoRoom>` (or self-host domain via `NEXT_PUBLIC_JITSI_DOMAIN`).
- Join button unlocks `scheduledAt - 5min`. Embedded via `@jitsi/react-sdk` iframe in `/consult/[id]`.

---

## 5. E-prescription (NMC §5.2.2)
- `lib/pdf/prescription.tsx` (`@react-pdf/renderer`) → fields: RMP name, NMC reg no, qualification,
  practice address, patient name/age/sex, date, drug list, dosage, instructions, digital signature line.
- **Hard rules** in `lib/rx-rules.ts`:
  - Schedule X drug names → reject (`SCHEDULE_X` list).
  - List A drugs allowed only if `consultation.mode === 'video'` and first consult.
  - `validUntil = date + 14 days`.
- Flow: doctor submits panel → validate → render PDF → upload to private bucket `prescriptions/` →
  store signed `pdfUrl` → notify patient.

---

## 6. Vital Checkup (USP)
- `lib/vitals-thresholds.ts` — normal ranges; `evaluate(vitals)` → `{flags:{bp:'high',spo2:'low',...}, escalate:boolean}`.
  Defaults: BP >140/90 high; SpO2 <94 low; HR <50 or >110; Temp >38.0; RBS >200; RR >24; pain ≥8.
- `POST /api/vitals` → store `vital_visits`, compute flags, generate report PDF (`lib/pdf/vitals.tsx`),
  if `escalate` → set `escalated`, alert admin, suggest teleconsult.
- `/vitals` dashboard → Recharts line charts per metric across visits.

---

## 7. Medicine & Lab (Phase-1 breadth)
- Medicine: `medicine_orders` (add table) — from prescription or manual upload (Storage), pharmacist
  review flag, status track. `/api/medicine`.
- Lab: `lab_orders` (add table) — test catalog (seed), home-collection slot, report upload + notify. `/api/lab`.
- (Tables added when these days arrive to avoid premature churn; pattern mirrors consult.)

---

## 8. Provider + Admin (merged)
- `/pro/*` ← hanuonepro `dashboard/*` (availability, bookings, earnings, profile). AuthZ: `requireRole('provider')`.
- `/admin/*` ← hanuonepro `admin/*` + new: consultations, payments/refunds, SLA board, audit viewer.
  AuthZ: `requireAdmin()`.
- Reuse existing API handlers (`availability`, `bookings`, `earnings`, `profile`, `register`,
  `upload`, `admin/professionals`, `track`) — repoint imports to unified `lib/db` + `lib/auth`.

---

## 9. Middleware (`middleware.ts`)
```
/pro/*    → requireUser; non-provider → /account
/admin/*  → requireAdmin; else → /account
/login    → if logged in → role home
matcher: ['/pro/:path*','/admin/:path*','/account/:path*','/consult/:path*','/login']
```
Reads session cookie via `lib/session` (edge-compatible jose verify).

---

## 10. Cross-cutting
- `lib/audit.ts` — `audit({actor, action, entity, entityId, meta, ip})` insert helper, never throws.
- `lib/notify.ts` — `notifyBooking()`, `notifyPrescription()`, etc. → MSG91 + Resend; best-effort.
- All API handlers: `runtime='nodejs'`, `dynamic='force-dynamic'`, zod-style manual validation,
  `HAS_DB` guard, try/catch → typed JSON error.

---

## 11. New dependencies (added to root package.json)
`jose` (session), `razorpay` (server SDK) or raw fetch, `@react-pdf/renderer` (PDF),
`@jitsi/react-sdk` (video), `recharts` (charts), `date-fns`, `@vercel/blob`/Supabase storage,
`bcrypt-ts` (legacy admin pw), `nanoid` (room ids), `next-auth` **removed**.

---

## 12. Build order (maps to 7-day plan)
1. Schema + auth foundation (done/in-progress).
2. Slots + consult booking + consent gate.
3. Razorpay order/verify + notify.
4. Jitsi room + e-prescription PDF + rx rules.
5. Vital Checkup intake + report + trends.
6. Merge provider/admin routes; medicine + lab.
7. UI polish + DPDP + audit viewer + end-to-end verify.
