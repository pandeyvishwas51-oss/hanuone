# HanuOne — UI/UX Enhancement Plan (every page)

Goal: lift **all 48 routes** to one cohesive, high-end design language. Two visual
worlds, one quality bar:
- **Patient site** — warm brand theme (cream `bg`, teal `primary`, orange `accent`), trust-forward, conversion-optimized.
- **Provider/Ops portals** — clean slate "SaaS" theme (already rebuilt as command centers).

Status legend: ✅ done · 🟡 partial · ⬜ todo

---

## 0. Design-system foundations (do FIRST — everything depends on these)

| Item | What | Status |
|---|---|---|
| **Shared primitives** | Extend a patient-side equivalent of `components/portal/ui.tsx`: `Card`, `Button`, `Badge/Pill`, `EmptyState`, `Skeleton`, `SectionTitle`, `Stat`. One import, consistent radii (rounded-2xl), shadows (`shadow-[0_1px_2px]` → `hover:shadow-md`), spacing. | ⬜ |
| **`ServiceHero`** | Premium gradient hero for patient pages. | ✅ (lab/vitals/medicine) |
| **Skeleton loaders** | `Skeleton` shimmer for lists/cards/detail while data loads (directory, account, my-bookings, dashboards). | ⬜ |
| **Toast system** | Replace scattered inline messages with a single toast (success/error) for actions (save, book, copy). | ⬜ |
| **Motion** | Standard hover-lift (`hover:-translate-y-0.5`), fade/slide-in for cards, button press; gate behind `prefers-reduced-motion`. | 🟡 (portals) |
| **Empty/error states** | Friendly icon + message + CTA everywhere (portals done; patient pages todo). | 🟡 |
| **Icon system** | lucide everywhere (portals done; patient site still mixed). | 🟡 |
| **Focus + a11y** | `focus-visible:ring-2` on all interactive els; labels; modal focus-trap; contrast (`emerald-700` not 600). | 🟡 |

---

## 1. Patient — home & marketing (SEO surfaces)

| Page | Enhancements | Status |
|---|---|---|
| **/** home | Hero video ✅. Restructure below the fold: trust strip (verified, ABDM-ready, X doctors), service tiles ✅ (add hover lift), "how it works" 3-step, featured doctors carousel, vitals USP band, testimonials/social-proof, city pincode SEO block, FAQ accordion, sticky mobile CTA. Tighten spacing + section rhythm. | 🟡 |
| **/doctors** directory | **Biggest win.** Redesign doctor cards (photo/initials, name, specialty, rating★, fee, experience, "Verified" badge, next-available, one-tap Book). Sticky filter sidebar on desktop → **bottom-sheet filters** on mobile. Sort pill row. **Skeleton grid** while loading. Empty state with reset. Result count + active-filter chips. | ⬜ |
| **/doctors/[slug]** profile | Hero card (photo, name, credentials, rating, fee, languages, locality) + **sticky Book CTA bar**. Tabs: About · Services · Timings · Reviews. Trust signals (NMC verified, consult modes). Related doctors. Breadcrumb. | ⬜ |
| **/[locality]/[specialty]**, **/localities/[slug]**, **/specializations/[slug]** | Consistent SEO hero + breadcrumb + doctor grid (reuse new cards) + internal-link cloud + AEO answer block + FAQ. | ⬜ |
| **/services** hub | Visual service cards (icon + image + 1-liner + CTA) in a clean grid; "all-in-one" framing. | ⬜ |
| **/home-nursing** | ServiceHero + service explainer + booking CTA → ServiceRequestDialog. | ⬜ |
| **/refer** | Referral hero, big share buttons (WhatsApp/copy), reward tracker, referral status list, how-it-works. | ⬜ |

---

## 2. Patient — transactional

| Page | Enhancements | Status |
|---|---|---|
| **/lab /medicine /vitals** | ServiceHero ✅. Polish the booking components: test/catalog selection cards (`aria-pressed`), summary/cart, slot picker, **sticky checkout bar**, progress + payment states, success screen. | 🟡 |
| **/book/[slug]** consult | Doctor summary card + slot-picker (calendar/agenda) + consent gate + **sticky Pay bar** with fee; step indicator (1 details → 2 slot → 3 pay); double-submit guard ✅; loading/disabled polish; success → consult link. | ⬜ |
| **/consult/[id]** room | Pre-join checklist (camera/mic), premium VideoRoom frame, side panel tabs (Prescription/Transcript) for providers, "awaiting payment" → ResumePayment ✅, waiting/ended states. | ⬜ |
| **/track/[id]** | Token-secured ✅. Polish: live map card, status **timeline** with ETA, professional card (name/photo/call), "arriving" animation. | 🟡 |
| **/account** | Welcome hero ✅. Polish sections into tabbed cards (Consults/Prescriptions/Vitals), skeletons, empty states, premium row design. | 🟡 |
| **/my-bookings** | Auto-load ✅. Card redesign with status pills, date/time/doctor, filters (upcoming/past), empty state, skeletons. | 🟡 |

---

## 3. Auth

| Page | Enhancements | Status |
|---|---|---|
| **/login** | Centered card + brand side-panel (logo, tagline, trust points) on desktop; inline validation; OTP step ✅; clearer error/needs-verify states ✅; social proof. | 🟡 |
| **/signup** | Same shell; channel-aware OTP ✅, phone-prefix validation ✅, max-attempts ✅; progress + success polish; password strength meter. | 🟡 |

---

## 4. Provider / Ops portals (command centers ✅ — polish the rest)

| Page | Enhancements | Status |
|---|---|---|
| **/clinic** home | Command center (hero, KPIs, quick-launch, agenda, revenue, recent patients). | ✅ |
| **/clinic/appointments** | Add a **calendar/agenda** view toggle; richer slot manager. | 🟡 |
| **/clinic/patients (+[id])** | Search + filter bar; patient timeline detail polish. | 🟡 |
| **/clinic/scribe** | Already premium; minor: voice-orb states, copy. | ✅ |
| **/clinic/prescriptions** | Rx detail/print template; templates library. | 🟡 |
| **/clinic/billing** | Invoice **detail + printable** view; filters. | 🟡 |
| **/clinic/analytics**, **/clinic/settings** | Charts + settings hub. | ✅ |
| **/care** (+ earnings/profile) | Hero ✅, visit workspace ✅ (modernized), bank form ✅. Polish earnings statements, profile edit. | 🟡 |
| **/console** (+ subpages) | Command center ✅, dispatch ✅, triage ✅, bookings/providers (add filters + cards), finance (real payouts view). | 🟡 |
| **/providers/register** wizard | **Modernize to the new system** — progress rail, polished steps, review screen, file-upload UI. Persists ✅. | ⬜ |
| **/providers**, **/providers/join** | Smart router ✅; join = marketing landing → polish. | 🟡 |

---

## 5. Admin (legacy — consolidate into /console design)

| Page | Enhancements | Status |
|---|---|---|
| **/admin/leads** | Move into `/console` shell + new design (board/table, status, filters). | ⬜ |
| **/admin/payouts** | New design; **surface provider bank/UPI details** (now collected) + release flow. | ⬜ |
| **/admin/seo** | Tooling page into console shell. | ⬜ |

---

## 6. Cross-cutting sweeps

- **Skeletons** on every data list/detail (perceived performance).
- **Toasts** for all mutations.
- **Mobile**: ≥44px tap targets, bottom-sheets over modals, sticky CTAs, safe-area.
- **A11y**: focus rings, aria-live on dynamic regions, labeled inputs, color-contrast, modal focus-trap.
- **Imagery**: optimized next/image, blur placeholders, consistent aspect ratios.
- **Micro-interactions**: hover lift, press, transitions; reduced-motion safe.

---

## Execution order (for the 10-min loop)

1. **P1 — patient conversion path:** `/doctors` directory cards → `/doctors/[slug]` profile → `/book/[slug]` flow → home polish → auth shell.
2. **P2 — patient transactional polish:** account, my-bookings, track, consult room, lab/medicine/vitals internals, services, refer.
3. **P3 — provider/admin:** onboarding wizard, console bookings/providers/finance filters, admin leads/payouts/seo → console.
4. **P4 — foundations sweep:** shared patient primitives, skeletons, toasts, a11y + motion pass across everything.

Each loop run: take the next page in this order, apply its enhancements, verify with typecheck + lint, report.
