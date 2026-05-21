# HanuonePro

Professional dashboard for healthcare gig workers in Lucknow. Doctors, nurses, ward boys, caregivers and physiotherapists register, get verified, mark availability, and track bookings + earnings.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (Auth + Postgres + Storage)
- Same design system as hanuone.in

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page (public) |
| `/register` | 3-step registration: account, profile, document upload |
| `/login` | Phone OTP or email/password login |
| `/dashboard` | Overview: stats, quick actions |
| `/dashboard/availability` | Mark working slots (date + time) |
| `/dashboard/bookings` | View/accept/decline/complete gigs |
| `/dashboard/earnings` | Income ledger |
| `/dashboard/profile` | Edit profile, rates, bio, availability toggle |

## Setup

1. Run `hanuonepro/supabase/schema.sql` in your Supabase SQL editor (same project as Hanuone).
2. Create a Supabase Storage bucket called `documents` (public read).
3. Enable Phone Auth in Supabase Auth settings (Twilio or MessageBird for OTP).
4. Copy `.env.local.example` to `.env.local` and fill in your keys.
5. `npm install && npm run dev` (runs on port 3002).

## Deploy

```bash
cd hanuonepro
vercel deploy --yes --prod --name hanuonepro
```

## How it connects to Hanuone (main site)

- When a family requests a home visit on hanuone.in, a booking row is inserted into the `bookings` table with the matched professional's ID.
- The professional sees it in their `/dashboard/bookings` and can accept/decline.
- Once completed, an `earnings` row is created automatically (via Supabase function or admin action).
- Verified professionals also appear on the main Hanuone directory with a "Home Care" badge.
