# HANUone — High-Level Design (HLD)

**Version:** 1.0 · **Date:** 2026-06-24 · **Owner:** Vishwas
**Scope:** Single consolidated Next.js app (patient + provider + admin) for the transacting MVP
(Consult + Vital Checkup + Medicine + Lab), test-mode ready to flip live.

---

## 1. Architecture at a glance

```
                          ┌─────────────────────────────────────────────┐
   Patients / Providers   │              hanuone.in  (Vercel)           │
   / Admin (browser, PWA) │           Next.js 14 App Router             │
        │                 │                                             │
        ▼                 │  Public site   /  (RSC, SSR, SEO)           │
  ┌───────────┐           │  Patient app   /account /book /consult      │
  │  Next.js  │◀─────────▶│  Provider app  /pro/*                       │
  │  routes   │           │  Admin portal  /admin/*                     │
  └───────────┘           │  API routes    /api/*  (Node runtime)       │
        │                 └───────┬─────────────────────┬───────────────┘
        │                         │                     │
        │                ┌────────▼────────┐   ┌────────▼─────────┐
        │                │  Drizzle ORM    │   │  Server actions  │
        │                │  (Neon/Supabase │   │  + API handlers  │
        │                │   Postgres)     │   └────────┬─────────┘
        │                └────────┬────────┘            │
        ▼                         ▼                      ▼
 ┌──────────────┐        ┌─────────────────┐   ┌────────────────────────┐
 │   MSG91      │        │  Supabase       │   │  External services      │
 │ OTP/SMS/WA   │        │  Postgres + RLS │   │  Razorpay (payments)    │
 └──────────────┘        │  Storage (docs, │   │  Jitsi (video)          │
                         │  prescriptions) │   │  Resend (email)         │
                         │  Auth (optional)│   └────────────────────────┘
                         └─────────────────┘
```

**Key decision:** one app, not two. `hanuonepro` is folded in under `/pro/*` (provider) and
`/admin/*` (admin). One `package.json`, one Drizzle schema, one auth system (MSG91 OTP).

---

## 2. Technology choices (locked)

| Layer | Tech | Notes |
|-------|------|-------|
| Framework | Next.js 14 App Router | SSR for SEO, RSC for data fetch, API routes (Node runtime) |
| Styling | Tailwind CSS | Existing design system, teal + orange brand |
| DB | Postgres (Supabase, Mumbai) via Drizzle ORM | `DATABASE_URL` (Neon serverless driver) |
| Auth | **MSG91 OTP** + signed session cookie (jose JWT) | Replaces NextAuth. Phone-first. |
| Payments | Razorpay (test → live) | Order create server-side, signature verify server-side |
| Video | Jitsi Meet (public rooms, JWT later) | Zero cost Phase 0 |
| Storage | Supabase Storage | KYC docs, prescriptions, lab reports, vitals PDFs |
| PDF | `@react-pdf/renderer` (server) | E-prescription + vitals report |
| SMS/WhatsApp | MSG91 | OTP now, transactional templates next |
| Email | Resend | Already wired for booking notifications |
| Charts | Recharts | Vitals trend dashboard |
| Hosting | Vercel | Edge network, env-managed secrets |

---

## 3. Modules & responsibilities

| Module | Routes | Responsibility |
|--------|--------|----------------|
| **Public directory** | `/`, `/doctors`, `/doctors/[slug]`, `/[locality]/[specialty]`, `/specializations/*`, `/localities/*` | SEO, discovery, doctor profiles (already built) |
| **Auth** | `/login`, `/api/auth/otp/*`, `/api/auth/logout` | MSG91 OTP send/verify, session issue/clear |
| **Patient app** | `/account`, `/book/[slug]`, `/consult/[id]`, `/my-bookings`, `/vitals` | Booking, consent, payment, video, prescriptions, vitals |
| **Consult engine** | `/api/consult/*`, `/api/slots/*` | Slot availability, booking lifecycle, doctor fallback |
| **Payments** | `/api/payments/order`, `/api/payments/verify`, `/api/payments/webhook` | Razorpay order + verify + refund |
| **Vital Checkup** | `/vitals`, `/api/vitals/*` | Intake, vitals capture, auto-report PDF, trends, alerts |
| **Medicine** | `/medicine`, `/api/medicine/*` | Prescription-linked order, manual upload, tracking |
| **Lab** | `/lab`, `/api/lab/*` | Test catalog, home-collection slot, report upload |
| **Provider app** | `/pro`, `/pro/availability`, `/pro/bookings`, `/pro/earnings`, `/pro/profile` | Provider dashboard (merged from hanuonepro) |
| **Admin** | `/admin/*` | Provider approval, bookings, consultations, refunds, SLA, analytics |
| **Compliance** | cross-cutting | Consent gate, audit logs, RLS, DPDP export/erasure |

---

## 4. Core flows (sequence summaries)

### 4.1 Teleconsultation (primary)
1. Patient logs in (MSG91 OTP) → session cookie.
2. Picks doctor → sees real `provider_slots`.
3. **Consent gate** (NMC telemedicine) — hard block, stored in `consents` + audit log.
4. Selects slot → `POST /api/payments/order` (Razorpay test) → checkout.
5. `POST /api/payments/verify` (signature check) → `consultations.status = booked`, slot marked booked.
6. WhatsApp/SMS (MSG91) + email confirmation.
7. Doctor 5-min accept window; no response → fallback reassign to same-specialty doctor, else refund.
8. At time: both join Jitsi room (`videoRoom`). Join unlocks 5 min before.
9. Doctor fills prescription panel → server generates PDF → `prescriptions.pdfUrl` → delivered.

### 4.2 Vital Checkup (USP)
1. Pre-visit intake form → `vital_visits` row.
2. Nurse/patient enters vitals → threshold engine flags abnormal → `flags`.
3. Auto-generate short PDF report → store → notify.
4. Trend dashboard reads historical `vital_visits` → Recharts mini-charts.
5. If thresholds breached → `escalated = true` → admin alert + suggest teleconsult.

### 4.3 Provider onboarding (merged)
1. Provider registers (MSG91 OTP) → `users.role = provider` + `professionals` row (`status=pending`).
2. Uploads Aadhaar + certificates → Supabase Storage.
3. Admin reviews → `status=verified` → appears in directory / bookable.

---

## 5. Security & compliance posture

- **Auth:** MSG91 OTP → short-lived signed JWT cookie (httpOnly, secure, sameSite=lax). 1h access, refresh on activity.
- **AuthZ:** middleware guards `/pro/*` (provider), `/admin/*` (admin). Row checks in API handlers.
- **RLS:** enabled on health/payment tables; patient reads own rows; doctor reads only for active consultation.
- **Consent:** hard gate before any teleconsult; immutable record with timestamp, IP, UA.
- **Audit:** every write to `consultations`, `prescriptions`, `payments`, `consents`, `vital_visits` → `audit_logs`.
- **PII:** health PDFs in private Supabase bucket, signed URLs only. No PHI to third parties (AI calls strip PII).
- **DPDP:** granular consent toggles, data export (JSON), erasure → anonymize + retain health record 7y.
- **Secrets:** all keys in Vercel env / `.env.local`. Never committed.

---

## 6. Environments & deployment

| Env | Branch | DB | Keys |
|-----|--------|----|----|
| Local | feature branches | dev Supabase | `.env.local` (test) |
| Preview | PRs | dev Supabase | Vercel preview env (test) |
| Production | `main` | prod Supabase (Mumbai) | Vercel prod env (test → live) |

**Flip-to-live = swap test keys for live keys** (Razorpay live, MSG91 prod sender, WhatsApp templates)
once incorporation + NMC + DPO gates clear. No code change required.

---

## 7. Non-functional targets (from PRD §9.4)

- Doctor search P95 < 2s · Booking confirm P95 < 3s · Video join P95 < 5s · Prescription gen < 4s.
- Mobile-first, PWA, Hindi UX where it matters.
- Zero regulatory violations (consent + prescription rules enforced in code).
