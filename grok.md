# COMBINED MASTER AUDIT — HanuONE Healthcare Platform

**Auditor:** Grok (SENTINEL-OMNI + QA Security Pass)  
**Date:** June 26, 2026  
**Scope:** Full codebase — 52 API routes, auth layer, middleware, payments, PHI flows, frontend pages/components, dependencies  
**Mode:** READ-ONLY observation. No code modified.

This document merges:

1. **Original QA & Security Audit** (first pass)
2. **SENTINEL-OMNI Forensic Audit** (5-role adversarial, 12-dimension, 3-pass with falsification)

**Jurisdiction note:** Primary market is India (DPDP Act, NMC telemedicine rules). HIPAA/Section 508/ADA analysis applied for international compliance posture.

---

# PART A — SENTINEL-OMNI MASTER FORENSIC AUDIT REPORT

Healthcare Application Security, Compliance & Quality Assessment  
**Methodology:** 5-role adversarial · 12-dimension · 3-pass with falsification

**Adversarial roles embodied:**

- **[ATTACKER]** Nation-state healthcare data exfiltration
- **[PATIENT-ADVERSARY]** URL tampering, browser exploitation
- **[HIPAA REGULATOR]** Surprise technical audit authority
- **[ACCESSIBILITY OFFICER]** Section 508 / WCAG 2.1 AA enforcement
- **[PRINCIPAL ENGINEER]** Cascade failure and systemic fragility

---

## EXECUTIVE THREAT BRIEF

HanuONE has strong foundations (httpOnly JWT sessions, Drizzle ORM, Razorpay webhook verification, consent gates on teleconsult) but **authorization is the dominant failure class** — PHI endpoints trust JWT `role` claims without resource-level ownership checks. A skilled attacker with a self-escalated `provider` account or a forged/misconfigured session could reach bulk patient data in **under 5 minutes**. Payment integrity is broken (client-controlled amounts). The running **Next.js 14.2.15** carries a **CVSS 9.1 middleware authorization bypass CVE**. HIPAA-equivalent breach notification would likely be **triggered** if exploited at scale. **Single most urgent action:** block deployment until payment server-side pricing + PHI IDOR fixes + Next.js upgrade to ≥14.2.25 are complete.

---

## P0 — CRITICAL (Stop all deployment)

### SO-P0-001 | Confidence: CERTAIN | Roles: ATTACKER, REGULATOR, ENGINEER

**Location:** `app/api/payments/order/route.ts`

**Evidence:** Server accepts client `amountInr`; no DB price lookup against `consultations.feeInr` / order record.

**Falsification condition:** Server-side price resolution and rejection of client amount would invalidate.

**Kill chain:** Create consult (₹800) → POST payment order with `amountInr: 1` → pay → verify → consultation booked.

**Regulatory trigger:** HIPAA §164.312(c)(1) integrity controls; DPDP data fiduciary duty; potential fraud.

**Fine exposure:** $100K–$1.9M per HIPAA category if US PHI involved; unlimited under DPDP for systemic breach.

**Fix direction:** Resolve authoritative price from DB; ignore client amount.

---

### SO-P0-002 | Confidence: CERTAIN | Roles: ATTACKER, REGULATOR

**Location:** `app/api/my-bookings/route.ts`

**Evidence:** `POST { phone }` — no auth, no OTP, no rate limit; returns 50 `doctorBookings` rows with patient name/phone/email; fallback scans last 200 bookings.

**Falsification condition:** Auth + phone OTP verification + rate limiting would invalidate.

**Kill chain:** Script phone numbers → bulk booking/PII harvest. **2 steps.**

**Blast radius:** All patients in `doctorBookings` table (bulk exfiltration).

**Regulatory trigger:** HIPAA breach notification (≥500 individuals); DPDP breach reporting.

**Fix direction:** Require verified identity before returning any booking data.

---

### SO-P0-003 | Confidence: CERTAIN | Roles: ATTACKER, PATIENT-ADVERSARY, REGULATOR

**Location:** `app/api/consult/[id]/transcript/route.ts`

**Evidence:** `user.role === "provider"` grants access to any consultation transcript without `doctorId` match.

**Falsification condition:** Provider-to-consultation binding check would invalidate.

**Kill chain:** Self-escalate to provider (SO-P0-005) → GET `/api/consult/{uuid}/transcript` → full PHI transcript. **3 steps.**

**Regulatory trigger:** HIPAA minimum necessary (§164.502(b)); breach notification.

**Fix direction:** Bind provider to `consult.doctorId` or explicit care-team relationship.

---

### SO-P0-004 | Confidence: CERTAIN | Roles: ATTACKER, REGULATOR

**Location:** `app/api/prescriptions/route.ts`

**Evidence:** Any `provider` role can POST prescription for any `consultationId`; no doctor binding.

**Falsification condition:** `consult.doctorId` ↔ provider profile verification would invalidate.

**Kill chain:** Provider account → POST prescription for arbitrary consult → forged e-Rx PDF + patient notification. **3 steps.**

**Regulatory trigger:** NMC telemedicine violation; HIPAA integrity + breach notification.

**Fix direction:** Verify prescriber is the consulting doctor before insert.

---

### SO-P0-005 | Confidence: CERTAIN | Roles: ATTACKER, REGULATOR

**Location:** `app/api/auth/firebase/route.ts:34`, `app/api/auth/otp/verify/route.ts`, `lib/auth.ts:68-77`

**Evidence:** Client passes `role: "provider"` → `upsertUserByPhone` promotes patient to provider without admin/license verification.

**Falsification condition:** Ignoring client role; requiring `professionals.status === "verified"` would invalidate.

**Kill chain:** Firebase/OTP login with `role:provider` → access `/clinic`, `/care`, prescriptions, transcripts. **2 steps.**

**Regulatory trigger:** HIPAA access control (§164.312(a)(1)); enables all PHI IDOR chains.

**Fix direction:** Never accept role from client at authentication.

---

### SO-P0-006 | Confidence: CERTAIN | Roles: ATTACKER, ENGINEER

**Location:** `middleware.ts:7-9`

**Evidence:** Hardcoded fallback `"dev-insecure-secret-change-me-please-32b"` when `AUTH_SECRET` unset; `lib/session.ts` throws in production but middleware does not.

**Falsification condition:** Middleware mirroring `session.ts` fail-closed behavior would invalidate.

**Kill chain:** Forge JWT with known secret → access `/admin`, `/console` as admin. **2 steps.**

**Fix direction:** Remove fallback; fail closed in production.

---

### SO-P0-007 | Confidence: CERTAIN | Roles: ATTACKER, ENGINEER

**Location:** `package.json` — `next: 14.2.15`

**Evidence:** npm audit flags **GHSA-f82v-jwr5-mffw** — Authorization Bypass in Next.js Middleware, CVSS **9.1**, range `>=14.0.0 <14.2.25`. App uses custom auth middleware on `/admin`, `/console`, `/clinic`.

**Falsification condition:** Upgrade to Next.js ≥14.2.25 (patched) would invalidate.

**Kill chain:** Exploit middleware bypass → reach admin/provider routes without valid session. **1–2 steps.**

**Regulatory trigger:** HIPAA access control failure.

**Fix direction:** Upgrade Next.js to latest patched 14.x minimum.

---

### SO-P0-008 | Confidence: CERTAIN | Roles: ATTACKER, PATIENT-ADVERSARY, REGULATOR

**Location:** `app/api/visits/[id]/location/route.ts`

**Evidence:** GET has zero auth; returns `staffLat`, `staffLng`, `etaMinutes` for any visit UUID. POST allows any logged-in user to spoof location/status.

**Falsification condition:** Patient/assigned-provider/admin checks on GET; assignment check on POST would invalidate.

**Kill chain:** Enumerate/guess visit UUIDs → real-time staff GPS. **2 steps.**

**Regulatory trigger:** HIPAA privacy; physical safety risk (stalking).

**Fix direction:** Scope reads and writes to authorized parties only.

---

### SO-P0-009 | Confidence: CERTAIN | Roles: ATTACKER, REGULATOR

**Location:** `app/api/payments/verify/route.ts:46-56`

**Evidence:** Payment marked paid by `razorpay_order_id` only; no `payment.userId === user.id` check.

**Falsification condition:** Ownership verification before status update would invalidate.

**Kill chain:** Compounds SO-P0-001; cross-user payment confirmation possible. **4 steps.**

**Fix direction:** Enforce payment ownership before confirming order.

---

### SO-P0-010 | Confidence: PROBABLE | Roles: ATTACKER, REGULATOR

**Location:** `lib/msg91.ts:71-72`

**Evidence:** When `MSG91_AUTH_KEY` unset, `verifyOtp` accepts `000000` for any phone.

**Falsification condition:** `MSG91_LIVE` required in production with fail-closed would invalidate.

**Kill chain:** Phone login with `000000` → full account access. **2 steps.**

**Regulatory trigger:** Authentication failure → breach via account takeover.

**Fix direction:** Fail closed when MSG91 not configured in production.

---

## P1 — HIGH

| ID | Location | Evidence | Confidence | Fix direction |
|----|----------|----------|------------|---------------|
| SO-P1-001 | `lib/session.ts`, `middleware.ts` | JWT embeds `role`/`isAdmin` for 7 days; no DB revalidation on `requireAdmin()` | CERTAIN | Re-fetch privileges from DB on sensitive routes |
| SO-P1-002 | `visits/[id]/photo`, `vitals` routes | Any provider can mutate any visit; no `assignedProfessionalId` check | CERTAIN | Mirror `providers/visits` assignment pattern |
| SO-P1-003 | `consent/route.ts:57-58` | Consent signature attachable to arbitrary `visitId` | CERTAIN | Verify visit ownership before update |
| SO-P1-004 | `pro/orders/route.ts` | Any provider updates any medicine order by ID | CERTAIN | Scope to assigned pharmacy partner |
| SO-P1-005 | `slots/route.ts` POST | Any provider publishes slots for any `doctorSlug` + sets `feeInr` | CERTAIN | Bind slot creation to verified doctor profile |
| SO-P1-006 | `clinic/scribe/*`, `clinic/docassist` | Logic `(!isDoctorRole && status !== "verified")` allows verified non-doctors | CERTAIN | Require `isDoctorRole && verified` |
| SO-P1-007 | `account/export/route.ts` | Full `users` row exported including `passwordHash` | CERTAIN | Select explicit safe fields only |
| SO-P1-008 | `whatsapp/webhook/route.ts` POST | No `X-Hub-Signature-256` verification | CERTAIN | Verify Meta HMAC on raw body |
| SO-P1-009 | `lib/email-otp.ts:64` | Returns `devCode` when delivery fails or `OTP_TEST_MODE=1` | CERTAIN | Never return OTP in production responses |
| SO-P1-010 | `realtime/session/route.ts` | Mints Azure realtime sessions without login; IP rate limit only | CERTAIN | Require auth + stricter quotas |
| SO-P1-011 | `realtime/book/route.ts` | Creates consultations/visits + SMS/email without auth | CERTAIN | Require auth + per-phone rate limits |
| SO-P1-012 | `auth/otp/send`, `otp/verify`, `verify`, `reset` | No rate limiting (unlike `login`/`signup`) | CERTAIN | Rate limit by IP + identifier |
| SO-P1-013 | `login/page.tsx`, `signup/page.tsx` | `?next=` passed to `router.push()` without allowlist | CERTAIN | Allow only relative paths starting with `/` |
| SO-P1-014 | `consult/[id]/page.tsx:22-24` | Any `provider` can join any consult video room | CERTAIN | Match provider to `consult.doctorId` |
| SO-P1-015 | `next@14.2.15` | GHSA-c4j6-fc7j-m34r SSRF via WebSocket (CVSS 8.6); multiple RSC DoS (CVSS 7.5) | CERTAIN | Upgrade Next.js |
| SO-P1-016 | `push/register/route.ts` | FCM tokens reassignable across users | PROBABLE | Bind tokens to authenticated session only |

---

## P2 — MEDIUM

| ID | Location | Issue | Confidence | Fix direction |
|----|----------|-------|------------|---------------|
| SO-P2-001 | All cookie-auth POST routes | CSRF — `sameSite: lax`, no Origin/CSRF tokens | CERTAIN | Strict sameSite or CSRF tokens on mutations |
| SO-P2-002 | `lib/ratelimit.ts` | Spoofable `X-Forwarded-For`; in-memory fallback per-instance | CERTAIN | Trust platform IP; require Upstash in prod |
| SO-P2-003 | `upload/route.ts` | Public bucket; client-controlled MIME/extension | CERTAIN | Private bucket + allowlist + magic bytes |
| SO-P2-004 | `book/route.ts`, `service-request/route.ts` | Unauthenticated spam → DB + email | CERTAIN | CAPTCHA + rate limits |
| SO-P2-005 | `lab/route.ts` | Client-controlled `priceInr` | CERTAIN | Server-side price from `labTests` |
| SO-P2-006 | `account/delete/route.ts` | Single POST delete; no confirmation; CSRF-vulnerable | CERTAIN | Confirmation step + CSRF protection |
| SO-P2-007 | `next.config.mjs` | No Content-Security-Policy header | CERTAIN | Add CSP |
| SO-P2-008 | `BookingDialog.tsx`, `ServiceRequestDialog.tsx` | PII (name/phone/email) in `localStorage` | CERTAIN | Avoid caching PHI client-side |
| SO-P2-009 | `api/track/route.ts` | Unauthenticated arbitrary analytics injection | CERTAIN | Validate event names; rate limit |
| SO-P2-010 | `book/route.ts:20` | Hardcoded fallback email `ritiktech970@gmail.com` | CERTAIN | Env-only ops email |
| SO-P2-011 | `consult/route.ts` + `payments/verify` | Slot `isBooked` checked at create but set only after payment — race allows double-book | PROBABLE | Reserve slot transactionally or lock at create |
| SO-P2-012 | `lib/audit.ts` | Audit logs writes only; PHI **reads** largely unlogged | CERTAIN | Log all PHI access (HIPAA §164.312(b)) |
| SO-P2-013 | `sentry.*.config.ts` | No PHI scrubbing configured; errors may contain patient data | PROBABLE | Configure Sentry `beforeSend` PHI redaction |
| SO-P2-014 | `api/health/route.ts` | Exposes AI/DB configuration status | CERTAIN | Minimal public response |
| SO-P2-015 | `middleware.ts` matcher | `/api/*` not protected at edge — per-route auth only | CERTAIN | Centralized API auth policy layer |
| SO-P2-016 | `auth/signup`, `auth/reset` | Min 6-char passwords | CERTAIN | Stronger password policy |

---

## P3 — LOW (Accessibility, polish, technical debt)

| ID | Location | Issue | WCAG/ADA | Fix direction |
|----|----------|-------|----------|---------------|
| SO-P3-001 | `BookingDialog`, `ServiceRequestDialog` | No focus trap, `role="dialog"`, `aria-modal` | 2.4.3 Focus Order | Add modal a11y pattern |
| SO-P3-002 | `CitySelector`, `LocationSelector` | Missing `aria-expanded`/`aria-haspopup` | 4.1.2 Name, Role, Value | Add ARIA state |
| SO-P3-003 | `login/page.tsx`, `signup/page.tsx` | Placeholder-only inputs, no `<label>` | 1.3.1 Info and Relationships | Associate labels |
| SO-P3-004 | `login`, `signup` Suspense | No fallback — blank flash | 2.2.1 Timing Adjustable | Add fallback UI |
| SO-P3-005 | `page.tsx:115-116` | Duplicate React keys (`/home-nursing`) | — | Unique keys + correct href |
| SO-P3-006 | `MobileBottomNav` | No login/account on mobile | 2.4.4 Link Purpose | Add account entry |
| SO-P3-007 | `ProfileForm.tsx` | Shows "Saved" on API failure | 3.3.1 Error Identification | Check `r.ok` |
| SO-P3-008 | `PatientChrome.tsx` | Admin pages show chat/voice widgets | — | Exclude `/admin` |
| SO-P3-009 | `ChatWidget.tsx` | Placeholder WhatsApp `919000012345` | — | Env-configured number |
| SO-P3-010 | `HeroHeadline.tsx` | City personalization dead code | — | Wire or remove |
| SO-P3-011 | `reactStrictMode: false` | Hides React double-render bugs | — | Enable strict mode |
| SO-P3-012 | No component `ErrorBoundary` | Only `global-error.tsx` at root | — | Add route-level boundaries |

---

## DEPENDENCY VULNERABILITY REGISTER

| Package | Version | CVE/GHSA | CVSS | Severity | Patched | Exploitability |
|---------|---------|----------|------|----------|---------|----------------|
| **next** | **14.2.15** | **GHSA-f82v-jwr5-mffw** (Middleware Auth Bypass) | **9.1** | **CRITICAL** | ≥14.2.25 | **ACTIVE** — app uses auth middleware |
| next | 14.2.15 | GHSA-c4j6-fc7j-m34r (SSRF WebSocket) | 8.6 | HIGH | ≥15.5.16 | PROBABLE if WebSocket upgrades used |
| next | 14.2.15 | GHSA-mwv6-3258-q52c, GHSA-5j59-xgg2-r9c4 (RSC DoS) | 7.5 | HIGH | ≥14.2.35 | ACTIVE — App Router RSC |
| next | 14.2.15 | GHSA-4342-x723-ch2f (Middleware SSRF) | 6.5 | MODERATE | ≥14.2.32 | PROBABLE |
| glob | 10.2–10.4 | GHSA-5j98-mcp5-4vw2 (CLI cmd injection) | 7.5 | HIGH | ≥10.5.0 | LOW — dev/eslint only, not runtime |
| eslint-config-next | 14.x | via glob | 7.5 | HIGH | 16.2.9 | LOW — dev only |
| drizzle-kit | 0.31.10 | via esbuild GHSA-67mh-4wv8-2f99 | 5.3 | MODERATE | 0.18.1+ | LOW — dev migrations only |
| postcss | <8.5.10 | GHSA-qx2v-qp2m-jg93 (XSS) | 6.1 | MODERATE | 8.5.10+ | LOW — build-time |

**P0 dependency action:** Upgrade `next` from `14.2.15` → **≥14.2.35** (or latest stable 15.x with regression testing).

---

## SYSTEMIC FAILURE REGISTER

### SO-SYS-001 — Provider Escalation × PHI IDOR Cascade

**Components:** `auth/firebase` + `auth/otp/verify` + `consult/transcript` + `prescriptions` + `consult/[id]/page`

**Emergent risk:** Individually, "provider role exists" is acceptable. Combined with self-service escalation and missing resource binding, **any user becomes a bulk PHI reader and forged prescriber in 3 API calls.**

**Severity:** CRITICAL compound — exceeds sum of parts.

---

### SO-SYS-002 — Payment Fraud × Slot Race × Notification Spam

**Components:** `payments/order` + `payments/verify` + `consult/route` + `notify`

**Emergent risk:** Attacker books at ₹1, races slot before payment confirmation, triggers patient/doctor notifications for fraudulent consults.

**Severity:** HIGH compound.

---

### SO-SYS-003 — Middleware Secret Fallback × Next.js CVE Middleware Bypass

**Components:** `middleware.ts` + `next@14.2.15`

**Emergent risk:** Two independent admin-route bypass paths — forged JWT (known secret) OR framework CVE. Defense-in-depth absent.

**Severity:** CRITICAL compound.

---

### SO-SYS-004 — Stale JWT × Unaudited PHI Reads

**Components:** `lib/session.ts` + transcript/visit/export APIs + `lib/audit.ts`

**Emergent risk:** Demoted provider retains 7-day access; reads are not audited → **breach occurs without forensic trail** → HIPAA breach notification without adequate investigation capability.

**Severity:** HIGH compound + regulatory.

---

### SO-SYS-005 — Client PII Cache × Missing CSP × Public Uploads

**Components:** `localStorage` patient cache + no CSP + public Supabase uploads bucket

**Emergent risk:** XSS (if introduced via upload or dependency) → steal cached patient PII from localStorage.

**Severity:** MEDIUM compound (requires XSS vector).

---

## FALSIFICATION LOG

| Finding | What was checked | Outcome |
|---------|------------------|---------|
| Razorpay free-payment in production | `lib/razorpay.ts` — `DEV_SHIM_OK = NODE_ENV !== "production"` | **DOWNGRADED** to dev-only; not P0 in properly configured prod |
| SQL injection | Drizzle parameterized queries across API routes | **REMOVED** — no evidence |
| HL7/FHIR integration risks | Codebase search | **REMOVED** — not applicable; moved to THEORETICAL |
| `dangerouslySetInnerHTML` XSS | All usages — `JSON.stringify` of static SEO data only | **DOWNGRADED** — low risk unless DB content injected into JSON-LD |
| `.env` committed | `.gitignore` includes `.env.local` | **REMOVED** as committed-secret risk |
| Consult page doctor-only access | `consult/[id]/page.tsx` | **UPHELD** — any provider allowed, not just consulting doctor |

---

## THEORETICAL FINDINGS (No code evidence — not ranked)

- BAA enforceability with Azure AI / Sentry / MSG91 without documented DPAs
- ADA Title III for mobile healthcare booking if US patients use service
- Ransomware via dependency supply chain beyond audited npm packages
- FHIR/HL7 integration security (no integration exists)

---

## REGULATORY EXPOSURE SUMMARY

| Framework | Assessment |
|-----------|------------|
| **HIPAA breach notification** | **TRIGGERED if exploited** — my-bookings bulk PII, transcript IDOR, visit GPS leak meet "acquisition of unsecured PHI" threshold |
| **Section 508 / WCAG 2.1 AA** | **HIGH** — modals lack focus management, forms lack labels, mobile nav missing account access |
| **ADA Title III** | **MEDIUM** — keyboard/focus gaps on booking modals and auth flows |
| **India DPDP Act** | **TRIGGERED** — unauthenticated booking lookup, excessive provider PHI access, incomplete audit of reads |
| **NMC Telemedicine** | **VIOLATED** — unauthorized e-prescriptions possible; consent forgeable on wrong visits |

**Estimated penalty exposure if audited today:** **$250K – $3.8M** (HIPAA multi-category) + **₹50Cr+** DPDP theoretical max + reputational/regulatory shutdown risk for healthcare license.

---

## WHAT IS ARCHITECTURALLY SOUND

Preserve these patterns:

- **httpOnly JWT cookies** (`lib/session.ts`) — auth tokens not in JS
- **Firebase JWKS verification** (`lib/firebase-verify.ts`)
- **Drizzle ORM** parameterized queries — no SQLi found
- **Telemedicine consent gate** on consult creation (`consult/route.ts`)
- **NMC Schedule X block** on prescriptions (`validatePrescription`)
- **Razorpay webhook signature verification** (`payments/webhook`)
- **Admin routes** consistently use `requireAdmin()` + audit
- **`providers/visits`** correctly enforces assignment — use as template for other visit APIs
- **AI doctor attachment sanitization** (MIME allowlist, size caps)
- **Security headers** (HSTS, X-Frame-Options, nosniff) in `next.config.mjs`
- **`.env` gitignored** — secrets not in repo
- **Global error handler** routes to Sentry without exposing stack to users
- **First-party analytics** — no third-party tracker on PHI DOM

---

## PRIORITY STRIKE ORDER

1. **SO-P0-001** — Payment price manipulation (direct revenue fraud)
2. **SO-P0-007** — Next.js middleware bypass CVE (CVSS 9.1)
3. **SO-P0-005** — Self-service provider escalation (unlocks all PHI chains)
4. **SO-P0-002** — Unauthenticated booking PII dump (bulk exfiltration, 2 steps)
5. **SO-P0-003** — Transcript IDOR (clinical PHI)
6. **SO-P0-004** — Prescription forgery (regulatory + patient harm)
7. **SO-P0-006** — Middleware hardcoded JWT secret
8. **SO-P0-008** — Visit GPS tracking leak
9. **SO-P0-009** — Payment verify ownership gap
10. **SO-P0-010** — MSG91 `000000` dev OTP in misconfigured prod
11. **SO-P1-001** — Stale JWT privileges (7-day admin persistence)
12. **SO-P1-007** — Password hash in data export
13. **SO-P1-008** — WhatsApp webhook spoofing
14. **SO-P1-013** — Open redirect on login
15. **SO-P2-012** — PHI read audit logging gap

---

# PART B — ORIGINAL QA & SECURITY AUDIT (First Pass)

*Full findings from initial codebase exploration. Overlaps with Part A are intentional for completeness.*

---

## What You're Building

**HanuONE** is a Lucknow-centric healthcare super-app:

| Surface | Purpose |
|---------|---------|
| Public SEO directory | Doctors, specialties, localities, combo pages |
| Patient services | Teleconsult, vitals, lab, medicine, nursing, AI doctor |
| Provider ops | `/providers`, `/clinic`, `/care` — visits, EMR, scribe |
| Admin | `/admin`, `/console` — leads, payouts, provider onboarding |

**Stack:** Next.js 14 App Router, Neon Postgres + Drizzle, Supabase Storage, custom JWT (`ho_session`), Razorpay, MSG91, Azure AI, Sentry.

---

## Executive Summary (First Pass)

| Severity | Count | Top risk |
|----------|-------|----------|
| **Critical** | 8 | Payment fraud, PHI leaks, unauthenticated booking lookup |
| **High** | 14 | Provider privilege escalation, stale JWT roles, dev-mode auth bypass |
| **Medium** | 16 | CSRF, rate limits, upload hardening, UI false-success states |
| **Low** | 10 | A11y, copy bugs, hardcoded URLs |

**Bottom line:** Solid foundations exist, but several issues are exploitable today in production — especially payments, PHI access control, and auth.

---

## Critical Bugs (First Pass)

| # | Bug | File | Impact |
|---|-----|------|--------|
| 1 | Client-controlled payment amount | `payments/order/route.ts` | Pay ₹1 for ₹800 consult |
| 2 | Payment verify no ownership | `payments/verify/route.ts` | Cross-user payment confirmation |
| 3 | my-bookings no auth | `my-bookings/route.ts` | Bulk PII by phone enumeration |
| 4 | Visit GPS public read + open write | `visits/[id]/location/route.ts` | Stalking + spoofing |
| 5 | Any provider → all transcripts | `consult/[id]/transcript/route.ts` | PHI leak |
| 6 | Any provider → any prescription | `prescriptions/route.ts` | Forged e-Rx |
| 7 | Client `role:provider` at login | `auth/firebase`, `auth/otp/verify`, `lib/auth.ts` | Unverified provider access |
| 8 | Middleware JWT secret fallback | `middleware.ts` | Forged admin sessions |

---

## High Severity (First Pass)

### Auth & session

- JWT `role`/`isAdmin` never re-validated from DB (7-day TTL)
- MSG91 dev mode: OTP `000000` when `MSG91_AUTH_KEY` unset
- OTP codes returned in API when delivery fails
- OTP send/verify routes lack rate limiting
- Weak OTP pepper fallback (`AUTH_SECRET || "dev-secret"`)

### PHI IDOR (additional)

- Any provider can upload photos to any visit (`visits/[id]/photo/route.ts`)
- Any provider can record vitals / complete any visit (`visits/[id]/vitals/route.ts`)
- Consent signature attachable to arbitrary visits (`consent/route.ts`)
- Any provider can update any medicine order (`pro/orders/route.ts`)
- Any provider can publish slots for any doctor (`slots/route.ts`)
- Verified nurses can use DocAssist/Scribe (inverted auth logic)
- Account export leaks `passwordHash`
- Any provider can access any consult video page (`consult/[id]/page.tsx`)

### External / cost abuse

- WhatsApp webhook POST has no signature verification
- Realtime AI session minted without login
- Realtime book creates real orders without auth
- Push token hijacking

---

## Medium (First Pass)

- Open redirect via `?next=` on login/signup
- CSRF on state-changing cookie-auth endpoints
- Rate limit bypass via spoofed `X-Forwarded-For`
- In-memory rate limiter ineffective at scale
- Public file upload — weak validation, public bucket
- Unauthenticated booking / service spam
- Lab order price client-controlled
- Account delete — no confirmation, CSRF-vulnerable
- No Content-Security-Policy header
- Hardcoded ops email in `book/route.ts`
- Middleware does not protect `/api/*`
- AI doctor endpoint — no auth, IP rate limit only
- Health endpoint information disclosure
- PII in localStorage
- Weak password policy (min 6 chars)
- Admin leads — unvalidated status values

---

## UI / UX Bugs (First Pass)

### Broken flows (P1)

| # | Bug | File |
|---|-----|------|
| 43 | `ProfileForm` shows "Saved" even on API failure | `ProfileForm.tsx` |
| 44 | `DataRights` delete ignores API response | `DataRights.tsx` |
| 45 | Unverified email login has no recovery UI | `login/page.tsx` |
| 46 | Signup SMS channel shows "Verify your email" | `signup/page.tsx` |
| 47 | No login/account entry on mobile navigation | `SiteHeader.tsx`, `MobileBottomNav.tsx` |
| 48 | Consult booking allows payment without slot when slots exist | `ConsultBooking.tsx` |
| 49 | Duplicate React keys on homepage service grid | `page.tsx` |
| 50 | Physiotherapy card links to wrong page | `page.tsx` |
| 51 | Placeholder WhatsApp number in ChatWidget | `ChatWidget.tsx` |
| 52 | Hardcoded `hanuonepro.vercel.app` links | `MobileBottomNav.tsx`, `SiteFooter.tsx`, `Tracker.tsx` |

### Multi-city / content bugs

| # | Bug | File |
|---|-----|------|
| 53 | `LocationSelector` always writes city = "Lucknow" | `LocationSelector.tsx` |
| 54 | `HeroHeadline` city personalization is dead code | `HeroHeadline.tsx` |
| 55 | Homepage hardcodes "Lucknow" in multiple places | `page.tsx` |
| 56 | Admin pages use patient chrome (chat, voice, bottom nav) | `PatientChrome.tsx` |
| 57 | Chat file upload failures are silent | `ChatWidget.tsx` |
| 58 | `in_progress` consultation status has no badge styling | `account/page.tsx` |

### Accessibility

| # | Issue | Files |
|---|-------|-------|
| 59 | Modals lack focus trap, `role="dialog"`, `aria-modal` | `BookingDialog.tsx`, `ServiceRequestDialog.tsx` |
| 60 | Dropdowns missing `aria-expanded` / `aria-haspopup` | `CitySelector.tsx`, `LocationSelector.tsx` |
| 61 | Login/signup forms missing associated `<label>` elements | `login/page.tsx`, `signup/page.tsx` |
| 62 | `Suspense` without fallback on auth pages | `signup/page.tsx`, `login/page.tsx` |

### Sitemap review

| Item | Status |
|------|--------|
| Static routes (`/`, `/doctors`, `/services`, `/lab`, etc.) | OK if pages exist |
| Dynamic doctor/locality/specialization/combo URLs | OK |
| Missing (intentional?) | `/providers/register`, `/login`, `/signup`, `/account` — likely fine (noindex) |
| `BASE` fallback | `https://hanuone.in` — ensure `NEXT_PUBLIC_SITE_URL` set in all deploy envs |

No clearly broken sitemap paths found.

### Auth token storage summary

| Mechanism | Storage | Assessment |
|-----------|---------|------------|
| Session (`ho_session`) | httpOnly cookie, `secure` in prod, `SameSite=Lax` | **Good** |
| Firebase Google `idToken` | Sent once to API, not stored client-side | **Good** |
| City preference | `localStorage` + `hanuone_city` cookie | OK |
| Patient form cache | `localStorage` | **Risk** (PII) |
| Visitor ID | `localStorage` | OK for analytics |
| Referral code | `localStorage` (`hanuone:ref`) | OK |

---

## Architectural Issues (First Pass)

1. **Docs vs reality** — README describes directory MVP; app is full healthcare OS
2. **Duplicate app (`hanuonepro/`)** — Nested Next app with NextAuth vs custom JWT in main app
3. **Monolithic schema** — One large `lib/db/schema.ts` for directory, gigs, payments, EMR, AI
4. **Dual auth systems** — Custom JWT + NextAuth in nested app
5. **Security footguns** — Middleware dev secret fallback; `reactStrictMode: false`; two bcrypt libs
6. **`HAS_DB` degradation** — Inconsistent behavior without DB
7. **Scraped Practo data** — Legal/ops risk for production
8. **Feature sprawl** — Directory, telemedicine, gig marketplace, EMR, payments in one repo
9. **Supabase split-brain** — Postgres on Neon, storage on Supabase
10. **No centralized API auth** — 52 routes enforce auth independently

---

## What's Working Well (First Pass)

- Session cookies: httpOnly, `secure` in prod, `SameSite=Lax`
- Firebase token verification with JWKS
- Razorpay webhook signature verified
- Admin API routes use `requireAdmin()` + audit
- Provider visits correctly check assignment
- Drizzle ORM — no SQL injection found
- Security headers in `next.config.mjs`
- NMC Schedule X block on prescriptions
- AI doctor attachment sanitization
- Sentry integration

---

## Routes in Good Shape (First Pass)

| Area | Routes | Notes |
|------|--------|-------|
| Admin | `admin/professionals`, `admin/leads`, `admin/payouts`, `admin/visits/assign`, `admin/verify-license` | `requireAdmin()` + audit |
| Provider (scoped) | `providers/visits`, `providers/bookings`, `providers/availability` | Assignment/ownership checks |
| Account | `account/profile`, `account/export` | User-scoped (export leaks hash — see bugs) |
| Consult create | `consult/route.ts` | Auth + consent gate |
| Razorpay webhook | `payments/webhook` | Signature verified |
| Auth (partial) | `auth/login`, `auth/signup`, `auth/forgot` | Rate limited |

---

# PART C — UNIFIED REMEDIATION ROADMAP

## Week 1 — Deployment blockers

- [ ] Server-side payment pricing + ownership on verify
- [ ] Remove client `role:provider` at auth
- [ ] Fix middleware secret fallback
- [ ] Upgrade Next.js to ≥14.2.35
- [ ] PHI IDOR fixes (transcript, prescription, visits, consent)
- [ ] Lock down `/api/my-bookings`
- [ ] Fail-closed MSG91/OTP in production

## Week 2 — High priority

- [ ] DB role revalidation on admin/provider routes
- [ ] WhatsApp webhook signature verification
- [ ] Rate limits on OTP + open booking endpoints
- [ ] Doctor-only scribe/docassist logic
- [ ] Sanitize `?next=` redirects
- [ ] Exclude `passwordHash` from account export
- [ ] PHI read audit logging

## Week 3 — UX & compliance

- [ ] Mobile account/login nav
- [ ] ProfileForm / DataRights error handling
- [ ] Modal accessibility (WCAG)
- [ ] Strip patient chrome from `/admin`
- [ ] Env-configured URLs and phone numbers
- [ ] Sentry PHI scrubbing

## Ongoing — Architecture

- [ ] Unify or retire `hanuonepro/` nested app
- [ ] Split schema by bounded context
- [ ] Centralized API auth middleware / policy layer
- [ ] Add Content-Security-Policy header
- [ ] Enable `reactStrictMode`
- [ ] Transactional slot booking locks

---

## Attack Scenario Map

```
Attacker
  ├─ POST /api/my-bookings {phone} ──────────────► 50 patient records (2 steps)
  ├─ Login role=provider ────────────────────────► /clinic + all PHI APIs (2 steps)
  │    └─ GET /api/consult/{id}/transcript ──────► Clinical transcripts (3 steps)
  │    └─ POST /api/prescriptions ───────────────► Forged e-Rx (3 steps)
  ├─ POST /api/payments/order amountInr=1 ───────► ₹1 consult (3 steps)
  ├─ GET /api/visits/{uuid}/location ────────────► Nurse GPS (2 steps)
  └─ Next.js CVE middleware bypass ──────────────► /admin without session (1-2 steps)
```

---

## Report Metadata

| Field | Value |
|-------|-------|
| Total unique findings | ~75 |
| Deployment blockers | ~15 |
| API routes audited | 52 |
| Audit passes | 2 (QA + SENTINEL-OMNI) |
| Code modified | None |

---

*End of sealed forensic report. Generated by Grok — READ-ONLY observation mode.*

---

# PART D — SENTINEL-QA AUTONOMOUS TEST REPORT

**Methodology:** 6-persona simulation · Feature inventory · Journey mapping · Code-trace execution · Cross-feature interaction · Error state audit · Regression surface mapping

**Note:** Several issues from Parts A–C have been **fixed in code since those audits** (payment server-side pricing, payment ownership verify, my-bookings auth, transcript provider IDOR, visit POST authorization). This pass reflects **current codebase state** as of June 26, 2026.

---

## TEST MANIFEST

### Public / Patient (1–23)

| # | Feature | Screen / Entry | APIs Triggered |
|---|---------|----------------|----------------|
| 1 | Homepage browse | `/` | Analytics track |
| 2 | Doctor directory | `/doctors` | Search queries |
| 3 | Doctor profile | `/doctors/[slug]` | — |
| 4 | Legacy booking dialog | Doctor profile modal | `POST /api/book` |
| 5 | Paid video consult booking | `/book/[slug]` | `POST /api/consult`, `POST /api/payments/order`, `POST /api/payments/verify` |
| 6 | Email/password login | `/login` | `POST /api/auth/login` |
| 7 | Google login | `/login` | `POST /api/auth/google` |
| 8 | Signup + OTP | `/signup` | `POST /api/auth/signup`, `POST /api/auth/verify` |
| 9 | Password reset | `/login` forgot flow | `POST /api/auth/forgot`, `POST /api/auth/reset` |
| 10 | Account dashboard | `/account` | Server-side DB reads |
| 11 | Profile edit | Account → ProfileForm | `GET/POST /api/account/profile` |
| 12 | Data export / delete | Account → DataRights | `GET /api/account/export`, `POST /api/account/delete` |
| 13 | My bookings list | `/my-bookings` | `POST /api/my-bookings` |
| 14 | Vital checkup booking | `/vitals` | `POST /api/vitals/book` |
| 15 | Lab test booking | `/lab` | `POST /api/lab`, payments APIs |
| 16 | Medicine order | `/medicine` | `POST /api/upload`, `POST /api/medicine` |
| 17 | Home nursing / service request | `/home-nursing` etc. | `POST /api/service-request` |
| 18 | AI Doctor chat | `/ai-doctor` | `POST /api/ai-doctor` |
| 19 | Floating chat widget | All patient pages | `POST /api/ai-doctor` |
| 20 | Voice agent | FloatingVoiceAgent | `POST /api/realtime/session`, `POST /api/realtime/book` |
| 21 | Referrals | `/refer` | `GET/POST /api/referrals` |
| 22 | Visit tracking | `/track/[id]` | `GET /api/visits/[id]/location` (poll 8s) |
| 23 | City / locality / pincode picker | Header, search | localStorage + `GET /api/serviceability` |

### Provider (24–30)

| # | Feature | Screen | APIs |
|---|---------|--------|------|
| 24 | Provider registration wizard | `/providers/register` | OTP, `POST /api/providers/register` |
| 25 | Provider dashboard | `/providers` | Various reads |
| 26 | Visit workspace | `/providers/visits/[id]`, `/care/visits/[id]` | `POST /api/providers/visits`, visit sub-APIs |
| 27 | Slot publishing | Provider tools | `POST /api/slots` |
| 28 | Clinic scribe / EMR | `/clinic/scribe` | `POST /api/clinic/scribe/*` |
| 29 | Consult video room | `/consult/[id]` | VideoRoom, transcript, prescriptions |
| 30 | Care nurse dashboard | `/care` | Visits, earnings |

### Admin / Ops (31–35)

| # | Feature | Screen | APIs |
|---|---------|--------|------|
| 31 | Admin hub | `/admin` | — |
| 32 | Leads board | `/admin/leads` | `GET/POST /api/admin/leads` |
| 33 | Payouts | `/admin/payouts` | `GET/POST /api/admin/payouts` |
| 34 | SEO tools | `/admin/seo` | — |
| 35 | Ops console | `/console/*` | Admin bookings, finance, providers |

---

## EXECUTIVE SUMMARY

SENTINEL-QA traced **35 features** across **6 personas** and found **42 observable bugs** (6 P0, 14 P1, 14 P2, 8 P3). Recent fixes improved payments and my-bookings, but **visit tracking IDOR**, **provider self-escalation**, and **prescription forgery** remain exploitable from the user journey. The most dangerous path is: sign up as provider → open another patient's consult URL → issue a forged e-prescription. **Consult booking** has the highest bug density (slot skip, payment race, provider access mismatch). Recommended first fixes: (1) bind prescriptions to consulting doctor, (2) authenticate visit tracking reads, (3) fix DataRights/ProfileForm false-success states.

---

## P0 BUGS — STOP SHIP

---
**BUG ID:** QA-001  
**Severity:** P0 (PHI exposure)  
**Persona:** P3 — Malicious Actor  
**Feature affected:** Visit tracking (#22)  
**Test type:** Unhappy path — URL tampering  

**STEPS TO REPRODUCE:**
1. Obtain or guess any `serviceVisits` UUID.
2. Open `/track/{uuid}` or call `GET /api/visits/{uuid}/location`.
3. Observe response includes `staffLat`, `staffLng`, `etaMinutes`.

**EXPECTED BEHAVIOR:** Only the patient who booked the visit (or assigned staff) sees live GPS coordinates.

**ACTUAL BEHAVIOR:** `GET /api/visits/[id]/location` has no authentication; `TrackingView` polls it every 8 seconds and renders an OpenStreetMap embed with staff marker.

**ROOT CAUSE:** `app/api/visits/[id]/location/route.ts` GET handler returns coordinates without `authorizeVisit` or patient ownership check (POST was fixed; GET was not).

**PATIENT IMPACT:** PHI exposure — real-time staff location of home visits; stalking risk.

**FIX DIRECTION:** Require patient session match on `visit.patientUserId`, assigned provider, or signed tracking token before returning coordinates.

**REGRESSION RISK:** Medium — affects all home-visit notification links.

---

---
**BUG ID:** QA-002  
**Severity:** P0 (clinical harm risk)  
**Persona:** P3 — Malicious Actor  
**Feature affected:** Consult e-prescription (#29)  
**Test type:** Unhappy path — forged API request  

**STEPS TO REPRODUCE:**
1. Create any account and escalate to `provider` via `POST /api/auth/otp/verify` with `role: "provider"`.
2. Navigate to `/consult/{any-consultation-uuid}` (page allows any provider).
3. Fill PrescriptionPanel and submit → `POST /api/prescriptions`.

**EXPECTED BEHAVIOR:** Only the verified doctor conducting the consult can issue prescriptions.

**ACTUAL BEHAVIOR:** API checks `user.role === "provider"` only; no binding to `consult.doctorId`. Patient receives SMS notification with forged Rx PDF.

**ROOT CAUSE:** `app/api/prescriptions/route.ts` missing prescriber-to-consult doctor verification.

**PATIENT IMPACT:** Clinical harm risk — fraudulent medications issued in patient's name.

**FIX DIRECTION:** Verify issuing provider is the consulting doctor (or verified professional linked to that doctor record).

**REGRESSION RISK:** High — touches consult completion flow and notifications.

---

---
**BUG ID:** QA-003  
**Severity:** P0 (security / privilege escalation)  
**Persona:** P3 — Malicious Actor  
**Feature affected:** Phone OTP login (#6)  
**Test type:** Unhappy path — forged request body  

**STEPS TO REPRODUCE:**
1. Complete phone OTP flow normally.
2. In `POST /api/auth/otp/verify` (or `/api/auth/firebase`), include `"role": "provider"`.
3. Access `/clinic`, `/care`, `/providers` without admin verification.

**EXPECTED BEHAVIOR:** Provider role granted only after admin approves `professionals` application.

**ACTUAL BEHAVIOR:** `upsertUserByPhone` promotes patient → provider immediately.

**ROOT CAUSE:** `lib/auth.ts:68-77` and auth routes accept client-supplied `role`.

**PATIENT IMPACT:** PHI exposure — unlocks provider tools and QA-002 prescription chain.

**FIX DIRECTION:** Ignore client role at login; always default to `patient` until admin verifies professional profile.

**REGRESSION RISK:** High — all provider onboarding flows depend on this.

---

---
**BUG ID:** QA-004  
**Severity:** P0 (data loss / false assurance)  
**Persona:** P1 — Confused first-timer  
**Feature affected:** Account deletion (#12)  
**Test type:** Error state  

**STEPS TO REPRODUCE:**
1. Log in → Account → click "Delete my account" → confirm.
2. Simulate network failure or 401 (session expired) during `POST /api/account/delete`.

**EXPECTED BEHAVIOR:** User sees clear failure; account state unchanged; no redirect.

**ACTUAL BEHAVIOR:** `DataRights.tsx` always `router.push("/")` after fetch regardless of `r.ok`.

**ROOT CAUSE:** `components/DataRights.tsx` — no response status check.

**PATIENT IMPACT:** Data confusion — user believes account deleted when it was not.

**FIX DIRECTION:** Check API response before redirect; show explicit success or failure message.

**REGRESSION RISK:** Low.

---

---
**BUG ID:** QA-005  
**Severity:** P0 (phishing / account takeover vector)  
**Persona:** P3 — Malicious Actor  
**Feature affected:** Login / Signup redirect (#6, #8)  
**Test type:** Unhappy path — URL manipulation  

**STEPS TO REPRODUCE:**
1. Send victim link: `/login?next=https://evil-phishing.com/fake-hanuone`.
2. Victim logs in successfully.
3. `router.push(nextParam)` sends them to attacker's site.

**EXPECTED BEHAVIOR:** Redirect only to same-origin relative paths.

**ACTUAL BEHAVIOR:** `destFor()` in `login/page.tsx` returns raw `nextParam`; signup uses same pattern.

**ROOT CAUSE:** No allowlist validation on `?next=` parameter.

**PATIENT IMPACT:** PHI exposure — credential phishing after legitimate login.

**FIX DIRECTION:** Sanitize `next` to relative paths starting with `/` only; reject `//`, `http:`, `https:`.

**REGRESSION RISK:** Low.

---

---
**BUG ID:** QA-006  
**Severity:** P0 (PHI exposure on shared devices)  
**Persona:** P5 — Mobile user  
**Feature affected:** Booking dialog / service request (#4, #17)  
**Test type:** Cross-feature — localStorage bleed  

**STEPS TO REPRODUCE:**
1. User A books on shared family tablet via BookingDialog.
2. User B opens same browser, opens booking modal on another doctor.

**EXPECTED BEHAVIOR:** User B sees empty form or their own saved details only.

**ACTUAL BEHAVIOR:** `hanuone:patient` localStorage pre-fills User A's name, phone, email.

**ROOT CAUSE:** `BookingDialog.tsx` and `ServiceRequestDialog.tsx` cache PII in unscoped localStorage.

**PATIENT IMPACT:** PHI exposure — wrong patient data submitted or visible to next user.

**FIX DIRECTION:** Stop caching PHI in localStorage, or scope to authenticated user ID.

**REGRESSION RISK:** Medium — repeat booking UX will change.

---

## P1 BUGS — BROKEN FEATURES

| ID | Persona | Feature | Issue | Root cause | Fix direction |
|----|---------|---------|-------|------------|---------------|
| QA-007 | P1 | Login (#6) | Unverified email user gets error string only; no OTP step to complete verification | `login/page.tsx` doesn't handle `needsVerification` | Add inline verify flow or deep-link to signup OTP step |
| QA-008 | P1 | Signup (#8) | SMS channel selected but step 2 always says "Verify your email"; verify only sends email+code | Copy/logic mismatch in `signup/page.tsx` | Branch OTP step UI and verify payload by channel |
| QA-009 | P1 | Profile (#11) | "Saved" shown even when API returns 401/503/network error | `ProfileForm.tsx` no `r.ok` check | Gate success UI on response status |
| QA-010 | P2 | Consult booking (#5) | Double-click "Pay & confirm" can create duplicate consultations before `busy` locks | No request deduplication / idempotency key | Disable immediately; server-side idempotency on consult create |
| QA-011 | P1 | Consult booking (#5) | Slots exist but user can pay without selecting one; server allows empty `slotId` | `ConsultBooking.tsx` no required slot validation | Require slot when `slots.length > 0` |
| QA-012 | P1 | Consult video (#29) | Any `provider` can join any consult room and see PrescriptionPanel; transcript API blocks them (inconsistent) | `consult/[id]/page.tsx` allows any provider | Match provider to `consult.doctorId` or block room access |
| QA-013 | P1 | Vital checkup (#14) | UI offers "Pay online now" but `POST /api/vitals/book` never initiates Razorpay | Payment mode ignored server-side | Wire online payment or remove option until implemented |
| QA-014 | P1 | My bookings (#13) | Email/Google-only users with no phone see empty list silently | API returns `[]` when phone missing | Explain why empty; match bookings by `userId` not phone only |
| QA-015 | P5 | Mobile nav (#23) | No login/account link in bottom nav; desktop-only AccountNavLink | `MobileBottomNav.tsx` omits account | Add Account/Login tab |
| QA-016 | P3 | Chat widget (#19) | "Talk to real agent" opens placeholder `919000012345` | Hardcoded `WHATSAPP_URL` | Env-configured business number |
| QA-017 | P1 | Homepage (#1) | Physiotherapy card links to `/home-nursing`; duplicate React keys | `page.tsx` lines 115–116 | Unique hrefs and keys |
| QA-018 | P2 | Consult payment (#5) | Two users can book same slot; `isBooked` set only after payment completes | Race in `consult/route.ts` + `confirmConsultation` | Reserve slot transactionally at consult create |
| QA-019 | P1 | Signup (#8) | `devCode` displayed in UI when email delivery fails | `lib/email-otp.ts` + signup hint | Never surface OTP in production UI |
| QA-020 | P6 | Provider wizard (#24) | 10,000-char name accepted in UI; server may truncate silently | No maxLength on wizard inputs | Client + server length limits with user-visible errors |

---

## P2 BUGS — DEGRADED EXPERIENCE

| ID | Persona | Feature | Issue | Fix direction |
|----|---------|---------|-------|---------------|
| QA-021 | P5 | Tracking (#22) | Network drop during poll shows last state forever; no "connection lost" message | Surface poll failures in TrackingView |
| QA-022 | P5 | AI chat (#18) | Rate limit 429 shows generic error; no retry guidance | Specific 429 message with retry timer |
| QA-023 | P2 | Booking dialog (#4) | Double-submit on rapid "Request consultation" clicks | Disable button on first click; idempotent book API |
| QA-024 | P5 | Medicine upload (#16) | Upload failure shows error but form state preserved (good); no retry button | Add explicit retry on upload row |
| QA-025 | P1 | Location (#23) | `LocationSelector` always sets city to "Lucknow" regardless of header city | Sync with CitySelector state |
| QA-026 | P5 | Mobile nav (#23) | "Home Care" tab links externally to `hanuonepro.vercel.app`; never highlights active | Use internal `/providers/join`; fix match fn |
| QA-027 | P2 | Admin (#31) | Admin pages show ChatWidget + FloatingVoiceAgent + bottom nav | Exclude `/admin` in PatientChrome |
| QA-028 | P6 | Lab booking (#15) | `slotDate` optional with no min-date guard; past dates submittable | Validate date ≥ today client and server |
| QA-029 | P2 | Global errors | Most routes lack ErrorBoundary; only `global-error.tsx` | Add route-level boundaries on booking flows |
| QA-030 | P5 | Realtime voice (#20) | Session minting fails cryptically if Azure keys missing | Actionable "voice unavailable" with text fallback link |
| QA-031 | P2 | Service request (#17) | Error message references hardcoded `+91-9876543210` | Env-configured support number |
| QA-032 | P6 | Consult booking (#5) | `reason` textarea has no max length; 40k chars sent to API | Add maxlength + server validation message |
| QA-033 | P2 | Account (#10) | `in_progress` consult status has no badge color (falls back gray) | Add STATUS_COLOR entry |
| QA-034 | P2 | Hero (#1) | City personalization in HeroHeadline is dead code | Wire copy or remove misleading logic |

---

## P3 BUGS — POLISH & ACCESSIBILITY

| ID | Persona | Feature | Issue | WCAG | Fix direction |
|----|---------|---------|-------|------|---------------|
| QA-035 | P4 | Booking modal (#4) | No focus trap; backdrop click closes without focus restore | 2.4.3 | Implement dialog a11y pattern |
| QA-036 | P4 | Service request modal (#17) | Same modal a11y gaps | 2.4.3 | Same as QA-035 |
| QA-037 | P4 | Login/signup (#6, #8) | Inputs use placeholders only; no associated `<label>` | 1.3.1 | Add visible labels + htmlFor |
| QA-038 | P4 | City/locality dropdowns (#23) | Missing `aria-expanded` / `aria-haspopup` | 4.1.2 | Add ARIA state attributes |
| QA-039 | P4 | Error states | Errors shown as red text only (rose-600); no icon/text for colorblind | 1.4.1 | Add non-color error indicator |
| QA-040 | P4 | Auth pages | Suspense without fallback → blank flash | 2.2.1 | Add loading fallback |
| QA-041 | P4 | Consult booking (#5) | Slot `<select>` has no label element | 1.3.1 | Add "Choose a time slot" label |
| QA-042 | P5 | Homepage (#1) | Bottom nav 5 columns cramped at 375px; labels truncate | — | Test safe-area + font scaling at 200% zoom |

---

## CROSS-FEATURE INTERACTION BUGS

---
**BUG ID:** QA-X-001  
**Severity:** P0  
**Persona:** P3  
**Features:** Provider escalation (#24) + Consult room (#29) + Prescriptions (#29)  
**Test type:** Cross-feature  

**STEPS:** Self-escalate to provider → open `/consult/{victim-id}` → issue prescription.  
**EXPECTED:** Blocked at page and API.  
**ACTUAL:** Page allows entry; API accepts prescription.  
**ROOT CAUSE:** UI auth weaker than transcript API; prescriptions unscoped.  
**PATIENT IMPACT:** Clinical harm + PHI.  
**FIX DIRECTION:** Unify consult access policy across page, transcript, and prescription APIs.  
**REGRESSION RISK:** High.

---

---
**BUG ID:** QA-X-002  
**Severity:** P1  
**Persona:** P2  
**Features:** Consult create (#5) + Payment (#5) + Slots (#27)  
**Test type:** Cross-feature — concurrent users  

**STEPS:** Two users select same slot → both pay → both get `booked`.  
**EXPECTED:** Second user rejected at slot selection or payment.  
**ACTUAL:** Slot checked at consult create; `isBooked` flipped only in `confirmConsultation` after payment.  
**ROOT CAUSE:** Non-transactional slot reservation.  
**PATIENT IMPACT:** Data confusion — double-booked doctor slot.  
**FIX DIRECTION:** Lock slot at consult creation or use DB unique constraint.  
**REGRESSION RISK:** Medium.

---

---
**BUG ID:** QA-X-003  
**Severity:** P1  
**Persona:** P5  
**Features:** Login (#6) + Account profile (#11)  
**Test type:** Cross-feature — session expiry  

**STEPS:** Fill profile form → session expires → click Save.  
**EXPECTED:** "Session expired, please log in again" + preserved form data.  
**ACTUAL:** Shows "Saved" (QA-009); data lost on refresh.  
**ROOT CAUSE:** ProfileForm false success + no session expiry handling.  
**PATIENT IMPACT:** Data loss.  
**FIX DIRECTION:** Fix response check; preserve draft in sessionStorage on 401.  
**REGRESSION RISK:** Low.

---

---
**BUG ID:** QA-X-004  
**Severity:** P2  
**Persona:** P6  
**Features:** City selector (#23) + Search (#2) + Hero (#1)  
**Test type:** Cross-feature — state desync  

**STEPS:** Select city "Delhi" in header → use LocationSelector in search → pick locality.  
**EXPECTED:** Search scoped to Delhi.  
**ACTUAL:** LocationSelector writes `hanuone:city = "Lucknow"` always.  
**ROOT CAUSE:** Hardcoded city in LocationSelector.  
**PATIENT IMPACT:** Data confusion — wrong city results.  
**FIX DIRECTION:** Read/write active city from single source of truth.  
**REGRESSION RISK:** Medium.

---

## ERROR STATE AUDIT

| Location | Message | Verdict |
|----------|---------|---------|
| `ProfileForm` | *(none on failure)* — shows "Saved" | **BUG** — no error, false success |
| `DataRights` delete | *(none on failure)* — redirects home | **BUG** — silent failure |
| `ConsultBooking` | Shows API error string e.g. "Payment verification failed" | OK — specific |
| `ConsultBooking` | "Please accept telemedicine consent" | OK — actionable |
| `BookingDialog` | "Could not book. Please try again." | **BUG** — no next step (WhatsApp link missing here) |
| `BookingDialog` | "Network error. Please WhatsApp us directly." | OK — actionable |
| `ServiceRequestDialog` | Includes WhatsApp number on failure | OK |
| `AiDoctorChat` | Shows API error / rate limit message | Partial — 429 needs retry timing |
| `TrackingView` | Poll errors swallowed silently | **BUG** — no user feedback |
| `Login` | "Invalid email or password" | OK — generic (anti-enumeration) |
| `Login` | Unverified: error text only, no verify CTA | **BUG** — dead end |
| `Signup` | Shows `error` string from API | OK |
| `global-error.tsx` | "Something went wrong… refresh" | Partial — no preserve work (N/A at root) |
| `VitalCheckupBooking` | Field-level errors ("Enter name…") | OK — specific |
| `MedicineOrder` | "Upload a prescription or list medicines" | OK — actionable |
| `ChatWidget` file upload | *(was silent)* — now sets error in AiDoctorChat pattern | Verify ChatWidget still silent on invalid file |

---

## REGRESSION SURFACE MAP

**Rank 1 — Authentication & session** (`lib/session.ts`, `middleware.ts`, all `/api/auth/*`)  
Dependencies: Every protected feature (account, consult, provider, admin).  
Risk: Any auth change breaks login, role routing, and API 401 behavior.  
*Watch when changing: middleware matcher, JWT claims, cookie settings.*

**Rank 2 — Consult + payment chain** (`ConsultBooking`, `consult/route`, `payments/*`)  
Dependencies: Account consult list, video room, prescriptions, notifications.  
Risk: Slot races, double charges, orphaned `pending_payment` consults.  
*Watch when changing: fee resolution, Razorpay shim, confirmConsultation.*

**Rank 3 — Provider authorization** (`lib/provider.ts`, `authorizeVisit`, role promotion)  
Dependencies: Care visits, clinic scribe, prescriptions, slots.  
Risk: IDOR regressions if new visit/consult endpoints skip checks.  
*Watch when changing: any new `[id]` route under visits or consult.*

**Rank 4 — BookingDialog + /api/book**  
Dependencies: my-bookings, ops email, doctorBookings table.  
Risk: Spam, wrong patient data from localStorage.  
*Watch when changing: book API validation, NOTIFY_EMAIL.*

**Rank 5 — PatientChrome layout wrapper**  
Dependencies: Every patient-facing page including admin (bug).  
Risk: Wrong chrome on provider/admin surfaces.  
*Watch when changing: pathname exclusions.*

**Dependency graph (plain text):**

```
Auth ──► Account ──► Profile / DataRights / My bookings
  │
  ├──► Consult booking ──► Payments ──► Consult room ──► Prescription
  │
  ├──► Vitals / Lab / Medicine orders
  │
  └──► Provider role ──► Clinic / Care / Slots
         │
         └──► Visit tracking ◄── notifications (SMS link)
```

---

## WHAT WORKS WELL

Features that **passed all 6 persona paths** in current code trace:

| Feature | Why it passes |
|---------|---------------|
| Paid consult payment amount | Server resolves price from DB; client `amountInr` ignored (`payments/order`) |
| Payment ownership | Verify rejects wrong user's payment (`payments/verify`) |
| My bookings auth | Requires session; scopes to user's phone (`my-bookings`) |
| Transcript PHI scope | Providers no longer have blanket read access |
| Visit mutation IDOR | POST photo/vitals/location checks `authorizeVisit` |
| Telemedicine consent gate | Consult blocked without `consent: true` |
| Medicine login gate | Redirects to login if unauthenticated |
| Lab serviceability check | Pincode live check before home collection |
| AI doctor file validation | MIME allowlist + size cap with user-visible error (AiDoctorChat) |
| Admin API routes | `requireAdmin()` consistent |
| Booking form labels | BookingDialog has proper `<label>` elements |
| NMC Schedule X block | Prescription API returns 422 for blocked drugs |

**Do not modify these without regression testing.**

---

## INTERNAL SMELLS (not user-observable bugs)

- `reactStrictMode: false` — double-render bugs hidden
- `middleware.ts` hardcoded JWT secret fallback — security smell (covered in Part A)
- Duplicate `hanuonepro/` nested app — developer confusion only
- `drizzle-kit` in production dependencies — bundle size smell

---

## RECOMMENDED TEST ORDER FOR NEXT ROUND

1. **Consult + prescription chain** — after any auth or provider change
2. **Visit tracking GET** — after visit API changes
3. **Payment flow end-to-end** — after Razorpay or consult changes
4. **Login/signup/redirect** — after auth UI changes
5. **ProfileForm + DataRights** — after account API changes
6. **Mobile bottom nav + booking modals** — after layout changes
7. **Vital checkup payment mode** — when payment wiring added
8. **Cross-city selector** — after SEO/locality work

---

## SENTINEL-QA METADATA

| Field | Value |
|-------|-------|
| Features in manifest | 35 |
| Persona passes | 210 (35 × 6) |
| Bugs filed | 42 (+ 4 cross-feature) |
| P0 | 6 |
| P1 | 14 |
| P2 | 14 |
| P3 | 8 |
| Code modified | None |

---

*End of SENTINEL-QA report. Generated by Grok — READ-ONLY testing mode.*