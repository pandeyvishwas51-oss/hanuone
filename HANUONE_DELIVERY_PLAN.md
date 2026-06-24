# HANUone — Consolidation & Delivery Plan

**Author:** Vishwas (Co-Founder, Product & AI)
**Date:** 2026-06-24
**Goal:** Consolidate all work into one authoritative repo and ship a working, transaction-ready MVP.

---

## 0. The honest framing

The full PRD (Consult + Medicine + Lab + Nursing + Physio + AI advisory), **live with real
patients**, is **not** a 7-day deliverable. Not because of code speed — because live healthcare
transactions are gated by non-code dependencies that take weeks:

| Gate | Why it blocks "live" | Owner |
|------|----------------------|-------|
| Pvt Ltd incorporation | Razorpay **live** KYC requires it; PRD says it precedes any payment processing | Founders / CA |
| NMC telemedicine sign-off | Legal requirement to do teleconsults | Medical advisor |
| DPDP DPO appointment | Required before go-live (health data) | Founders / legal |
| Verified doctor supply | PRD min 60+/city; "delay rather than launch thin" | Ops |
| WhatsApp Business API approval | Template approval takes days | Vishwas |

**What 7 days CAN deliver:** the *complete working software* for a transacting MVP, in test mode,
in one private repo, with the polished UI. Flipping to live = swapping test keys for live keys once
the gates above clear.

---

## 1. Repo consolidation (the integration task)

### Current state
- **Org repo `Hanuone-tech/Hanuone`** — thin demo. No DB, hardcoded `lib/data.ts`. PUBLIC.
  Worth salvaging: `ChatWidget`, `MovingHero`, `home-nursing` page, `providers/register` wizard,
  hero images in `public/hero/`.
- **Local repo `pandeyvishwas51-oss/hanuone`** — the real foundation. Supabase/Drizzle, two apps
  (main site + `hanuonepro` provider/admin portal), multi-city data, SEO pages, booking
  persistence, provider auth + document upload, admin dashboard, analytics. **This is the source
  of truth.**

### BLOCKER — needs Aseem (org owner) today
- [ ] Add `vishwas-eng` (GitHub) as a collaborator on `Hanuone-tech/Hanuone` with **write/admin**.
- [ ] Make the repo **private**.
- [ ] Without this, nothing can be pushed to the org repo.

### Consolidation steps (once access granted)
1. Add `Hanuone-tech/Hanuone` as a git remote (`upstream`) on the local repo.
2. Salvage the org repo's unique UI into local: `ChatWidget`, `MovingHero`, `home-nursing`,
   hero images. Reconcile the `providers/register` wizard against `hanuonepro` (keep the better one).
3. Force the local codebase to become the org repo's `main` (the demo is superseded).
4. Verify build passes, then push. One authoritative private repo.

---

## 2. External setup checklist (accounts — do in parallel with build)

These produce the keys the code needs. **Test mode first.**

- [ ] **Supabase** project (Mumbai region) — DB + Auth + Storage. Run `supabase/schema.sql` +
      `hanuonepro/supabase/schema.sql` + seed files. Set `DATABASE_URL`, anon/service keys.
- [ ] **Domain** — point `hanuone.in` to Vercel; `pro.hanuone.in` (or path) to the provider app.
- [ ] **Razorpay** — TEST mode keys now; live mode after incorporation.
- [ ] **MSG91** — account for OTP/SMS/WhatsApp. (Or Supabase phone auth via Twilio for OTP.)
- [ ] **Resend** — already used for booking emails; confirm `RESEND_API_KEY` + verified domain.
- [ ] **Jitsi** — zero-cost video; no account needed for public rooms (self-host later for privacy).
- [ ] All secrets in Vercel env + local `.env.local` — never in code. (Fix hardcoded notify email in
      `app/api/book/route.ts`.)

---

## 3. Database — what to add to the schema

Existing tables (good): doctors, specializations, localities, reviews, waitlist, doctor_bookings,
service_requests, patients, users, professionals, availability, bookings, earnings.

**Add for transacting MVP (with RLS + audit):**
- `provider_slots` — bookable time slots per doctor (real availability)
- `consultations` — the 7 NMC record elements + status lifecycle
- `consents` — telemedicine consent, timestamped, immutable (NMC + DPDP)
- `prescriptions` — server-generated PDF refs, drug list, NMC reg no
- `payments` — Razorpay order/payment/refund state
- `medicine_orders`, `lab_orders` — Phase-1 modules
- `vitals` — Vital Checkup readings per visit (your USP, for trend charts)
- `audit_logs` — append-only, all writes to health tables
- RLS on all patient/health tables: patient reads own; doctor reads only for active booking.

---

## 4. The 7-day build plan (toward a transacting MVP)

Sequenced so each day produces something demoable. Vertical slice first (Consult), then breadth.

**Day 1 — Foundation & consolidation**
- Get org repo access (blocker), provision Supabase, wire env, run schema + seeds.
- Merge org UI assets into local. One repo, green build, deployed to Vercel preview.

**Day 2 — Patient auth + consent**
- Patient OTP login (Supabase phone auth / MSG91). Patient profile + health profile.
- NMC telemedicine **consent gate** (hard block) with timestamped storage + audit log.

**Day 3 — Real booking + payments**
- `provider_slots` + doctor availability UI (reuse hanuonepro availability).
- Slot selection → Razorpay (test) checkout → booking confirmed → WhatsApp/SMS + email confirm.
- Doctor 5-min accept window + fallback reassignment (PRD logic).

**Day 4 — Video consult + e-prescription**
- Jitsi room per consultation, join-button unlock 5 min before, basic recording-consent.
- Doctor prescription panel → server-generated PDF (NMC reg no, patient, drugs, Schedule X hard
  block) → delivered to patient app + WhatsApp.

**Day 5 — Vital Checkup (your USP)**
- Pre-visit form (history, allergies, meds, reason) + vitals checklist (BP, HR, SpO2, temp, RBS,
  weight, height, resp rate, pain).
- Auto short PDF report with normal/abnormal flags. Store per visit; mini trend charts in profile.
- Threshold alerts → escalation flag to admin / suggest teleconsult.

**Day 6 — Medicine + Lab + Admin**
- Medicine: prescription-linked order + manual upload, partner dispatch status, tracking.
- Lab: test catalog, home-collection slot, report upload + notify.
- Admin: extend dashboard to manage bookings, consultations, providers, refunds, SLA view.

**Day 7 — Polish, compliance, hardening**
- Next-level UI pass across the funnel (brand-consistent, mobile-first, Hindi UX where it matters).
- DPDP: granular consent toggles, data export, deletion/anonymization stub.
- Audit logs verified, RLS tested, error states, end-to-end test of the full slice.
- Deploy to production domain in **test/staging** posture, ready to flip live.

---

## 5. After 7 days — the path to genuinely live

1. Incorporation done → Razorpay live KYC → swap test keys for live.
2. NMC sign-off + DPO appointed → enable real teleconsults.
3. Onboard the minimum verified doctor supply per city.
4. WhatsApp Business API templates approved → switch confirmations from SMS to WhatsApp.
5. Soft launch (invite-only) → monitor SLAs → full launch.

---

## 6. Decisions — LOCKED (2026-06-24)

1. **Build now** in the local repo; push to org repo once Aseem grants write access + makes private.
2. **Merge `hanuonepro` into the main app** — single Next.js app. Provider routes under `/pro/*`,
   admin under `/admin/*`. Unify `package.json`, Drizzle schema, and auth. Replaces NextAuth.
3. **MSG91 directly** for OTP/SMS (and WhatsApp later). Patient + provider auth both via MSG91 OTP.
4. **Consult-first** vertical slice, then breadth (per Section 4 day plan).
