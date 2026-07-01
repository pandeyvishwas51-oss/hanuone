# HanuOne Provider Suite — Master Plan

> Three separate, sellable, AI-native products on one platform.
> Goal: beat eka.care / HealthPlix / Practo Ray on the two things that actually matter —
> **(1) removing the doctor's paperwork with an agentic, multilingual ambient AI scribe**, and
> **(2) ABDM/ABHA-native interoperable records** — while keeping the nurse field app and admin console
> as their own dedicated workspaces (not bolted onto the patient site).

Date: 2026-06-26 · Owner: HanuOne

---

## 0. Why this wins (the moat)

Research summary (sources at bottom):

- **eka.care** for-doctors = Voice-2-Rx + DocAssist (summary/chat) + EKA DOC practice mgmt + ABHA/ABDM + clinic commerce. Strong, but English-centric scribe and "suggestion" level AI.
- **HealthPlix** = physician-first EMR, fast multilingual Rx, voice-to-text, 10k+ doctors. Light on front desk.
- **Practo Ray** = brand + patient acquisition marketplace; expensive, ops-heavy.
- **Ambient AI scribe** (Abridge, Nabla, Suki, DAX) = the global standard of care in 2026; 92–96% note accuracy, ~1 hr/day saved, measurable burnout drop. Suki's edge = voice commands mid-visit + coding (ICD-10/CPT/HCC). Nabla's edge = RCT-proven. **Nobody has shipped a Hindi/Hinglish-first agentic scribe for India.**
- **Agentic AI** = 2026 shift from chatbots to autonomous, auditable, human-in-the-loop multi-step workflows (drug-interaction across polypharmacy, differential dx, readmission risk). Buyers are sick of "ChatGPT wrappers" — they reward depth, grounding, compliance, outcomes.

**Our unfair advantages already in the codebase:** Claude Opus 4.8 (Foundry) for clinical reasoning, gpt-realtime for voice, teleconsult transcription + AI summary, prescriptions, consent, gender-safe assignment, and a live marketplace that feeds the longitudinal record.

**The wedge:** *Doctor just talks (Hindi/Hinglish/English). The scribe writes the SOAP note + a coded, interaction-checked prescription the doctor signs in one tap.* Then layer the agentic copilot and ABDM on top.

---

## 1. Architecture — three separate workspaces

One Next.js codebase, **separate route groups with their own layouts** (no patient site chrome — no SiteHeader/footer/chat/voice bubble). Promote to subdomains later.

| Product | Route group | Audience | Layout |
|---|---|---|---|
| **HanuOne Clinic** | `/clinic/*` | Doctors & clinic staff (sellable SaaS) | Clinic shell: left nav, patient context rail |
| **HanuOne Care** | `/care/*` | Nurses / physios / caregivers (field) | Mobile-first app shell, big tap targets, offline |
| **HanuOne Console** | `/console/*` | HanuOne ops/admin | Dense data console |

- Entry routing by role at login: `admin → /console`, `provider(doctor) → /clinic`, `provider(home-care) → /care`, `patient → /` (existing site).
- A tiny middleware/guard per group enforces role + (for clinic/care) `professionals.status = verified`.
- Shared services stay shared: `lib/db`, `lib/auth`, `lib/ai-doctor` (Claude), `lib/realtime`, `lib/storage`, `lib/notify`.

### New data concepts to add
- **`clinics`/`orgs`** — a doctor or group owns a clinic; staff (front desk) belong to it; powers multi-doctor + selling SaaS to a practice.
- **`subscriptions`** — SaaS plan per clinic (trial/solo/clinic/multi-branch) for monetisation.
- **`emr_notes`** — structured SOAP notes (chief complaint, HPI, exam, assessment, plan) + transcript ref + audio ref.
- **`rx_items`** — coded prescription lines (drug, SNOMED/ICD-10, dose, freq, duration, interactions flagged).
- **`care_contexts`** + **`abha_links`** — ABDM care contexts and ABHA linkage.
- **`visit_verifications`** — GPS/geofence check-in/out for the nurse app (EVV-style proof).
- Extend `professionals` with `clinicId`, `hprId` (Healthcare Professional Registry), `abhaAddress`.

---

## 2. Product 1 — HanuOne Clinic (Doctor SaaS) `/clinic`

Sellable to *any* doctor, not just marketplace doctors.

**Modules**
1. **Today / Queue** — unified walk-ins + appointments + teleconsults, drag to reorder, status flow, follow-up reminders.
2. **Consult Workspace (the star)** — open a patient → **Ambient AI Scribe**:
   - Live multilingual transcription (Hindi/Hinglish/English) via realtime voice.
   - Claude generates **SOAP note + draft Rx** grounded in the transcript + patient history.
   - **Magic Box**: patient history, allergies, past Rx, last vitals surfaced beside the note.
   - Doctor edits & **signs**; one tap → e-Rx to patient (WhatsApp/SMS/app) + saved to EMR.
3. **Smart Rx pad** — speciality templates, SNOMED-CT + ICD-10 coded drug DB, **drug–drug & allergy interaction checks**, dose calculators, branded printable Rx.
4. **Agentic DocAssist** — beyond suggestions: differential diagnosis, guideline-grounded advice, "summarise this patient," draft referral/discharge, lab-report parsing & summary. Human-in-the-loop, every action auditable.
5. **EMR** — patient timeline, global search, visit history, documents, lab/imaging results.
6. **Labs & meds** — order labs/meds to patient's door (clinic commerce / extra revenue), smart lab report scan + summarise.
7. **Billing** — invoices, dues, payments (Razorpay), GST, daily reports.
8. **Analytics** — revenue, patient trends, no-show rate, treatment efficacy, repeat rate.
9. **Engagement** — automated reminders, recall campaigns, broadcasts, reviews.
10. **ABHA/ABDM** — create/link ABHA, write care contexts, share records (HIP), pull history (HIU), HPR profile, DHIS incentives.
11. **Settings** — clinic profile, Rx branding, templates, fees, availability, staff roles & permissions, subscription/billing.

---

## 3. Product 2 — HanuOne Care (Nurse / field workforce) `/care`

Mobile-first, offline-first field app. Benchmarked against AlayaCare/CareVoyant/AxisCare EVV apps + our safety/AI edge.

**Modules**
1. **My day** — today's visits, optimised route/map, schedule, self-service shift accept/decline, real-time push.
2. **Visit verification (EVV-style)** — GPS + geofence check-in/out at the patient address = tamper-proof proof of visit; feeds payout.
3. **Offline-first** — log vitals, notes, photos, consent without signal; auto-sync on reconnect (service worker + IndexedDB). Critical for India connectivity.
4. **Point-of-care** — vitals with auto abnormal-flagging + escalation, patient photo (privacy eye-blur), consent e-signature, care-plan task checklist, eMAR (meds administered), wound/notes + photos.
5. **Voice documentation** — nurse talks; we log vitals/notes (reuse realtime voice).
6. **Safety** — SOS/distress button, live location share with ops during visits only.
7. **Escalation** — flag abnormal vitals → instant push to on-call doctor / console triage queue.
8. **Earnings & payouts** — credited per verified visit, weekly payout view.
9. **Messaging** — two-way with ops + assigned doctor.

---

## 4. Product 3 — HanuOne Console (Admin / Ops) `/console`

Dedicated ops command center (off the patient site entirely).

**Modules**
1. **Command dashboard** — live ops: visits in progress, consults today, abnormal-vitals alerts, SLA breaches, revenue today.
2. **Provider lifecycle** — applications → verify license/ABHA/HPR → approve/suspend/quality scores; document review.
3. **Assignment engine** — gender-safe matching, dispatch, manual reassign, SLA & ETA tracking.
4. **Catalog** — doctors, services, labs, meds, pricing, serviceable pincodes.
5. **Bookings & orders** — every service in one queue; intervene, refund, reschedule.
6. **Finance** — payments, payouts, reconciliation, refunds, subscription revenue (doctor SaaS).
7. **Patients & records** — search, escalations, triage queue for flagged vitals.
8. **Marketing** — referrals, campaigns, content, SEO surfaces.
9. **Analytics** — funnels, cohorts, city/pincode demand, provider utilisation.
10. **Compliance** — audit logs, consents, DPDP data requests, role/permission management for ops staff.

---

## 5. AI & tech building blocks

- **Claude Opus 4.8** (Azure Foundry) — scribe SOAP/Rx generation, DocAssist agent, summaries, differential.
- **gpt-realtime** — voice for scribe + nurse voice docs.
- **RAG layer** — vector store over patient history + clinical guidelines (grounding, anti-hallucination).
- **Coded clinical data** — SNOMED-CT + ICD-10 + an Indian drug/brand DB + interaction rules.
- **FHIR R4** mapping layer (India profiles) + **ABDM V3** client (sandbox → production).
- **Offline** — service worker + IndexedDB sync queue for the Care app.
- Existing: Drizzle + Neon + Supabase storage + Razorpay + Resend/MSG91 + Firebase push.

---

## 6. Phasing (so we can build + test in passes)

- **Phase 0 — Shells (now):** create `/clinic`, `/care`, `/console` route groups with their own layouts + role-gated entry; move the existing doctor/nurse dashboards into `/clinic` and `/care`; move admin into `/console`. *Outcome: three separate apps, testable immediately.*
- **Phase 1 — The moat MVP:** Ambient AI Scribe → SOAP + draft Rx + sign (Clinic); offline visit + GPS verify + voice vitals (Care); command dashboard + provider lifecycle (Console).
- **Phase 2 — Depth:** Agentic DocAssist (interactions, differential, Magic Box RAG), Smart Rx pad with coded DB, EMR timeline, billing & analytics.
- **Phase 3 — ABDM:** M1 ABHA create/link → M2 HIP share records → M3 HIU fetch records (sandbox cert → production). Regulatory, ~4–7 months of the roadmap; start sandbox early.
- **Phase 4 — Monetise & scale:** doctor subscriptions/trials, multi-doctor clinics, white-label, DHIS incentives, marketplace cross-sell.

---

## 7. Go-to-market (selling the doctor SaaS)

- Wedge = the **multilingual ambient scribe** (free trial, "write zero prescriptions by hand").
- Tiers: Solo / Clinic / Multi-branch; per-doctor monthly + free trial.
- Hooks: ABDM **DHIS incentives**, patient acquisition from the HanuOne marketplace, clinic-commerce extra revenue.

---

## Sources
- eka.care for-doctors — https://www.eka.care/s/for-doctors
- ABDM M1/M2/M3 certification — https://codingclave.com/guides/abdm-m1-m2-m3-certification-guide-india-2026 , https://sandbox.abdm.gov.in/docs/integration_and_exit_process , https://nirmitee.io/blog/abdm-integration-milestones-m1-m2-m3-m4-multi-software-guide/
- Ambient AI scribes 2026 — https://glass.health/resources/best-ai-medical-scribe , https://www.soapnoteai.com/soap-note-guides-and-example/best-ai-medical-scribes-2026/
- Home-health field/EVV apps — https://alayacare.com/blog/the-best-evv-software-for-home-care-2026/ , https://www.carevoyant.com/home-health-blog/cv-mobile-evv-scheduling-home-care-app
- India clinic SaaS — https://medkyo.com/practo-alternatives-india , https://allhealthtech.com/clinic-management-systems-in-india/
- Agentic AI in healthcare — https://www.acldigital.com/blogs/agentic-ai-healthcare-software-autonomous-innovation-2026 , https://www.kore.ai/blog/ai-agents-in-healthcare-12-real-world-use-cases-2026
