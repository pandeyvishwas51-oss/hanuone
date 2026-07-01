-- 0004_ops_platform.sql
-- Operations platform: serviceability, onboarding leads, verification,
-- home-visit tracking, delivery, payouts, analytics, push, referrals.
-- Safe to run multiple times (IF NOT EXISTS).

create table if not exists serviceable_areas (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  pincode text not null,
  locality text,
  service text not null,
  status text not null default 'live',
  notes text,
  updated_at timestamptz default now()
);
create index if not exists idx_serviceable_pincode on serviceable_areas (pincode);
create unique index if not exists uq_serviceable on serviceable_areas (pincode, service);

create table if not exists service_demand (
  id uuid primary key default gen_random_uuid(),
  pincode text not null,
  city text,
  service text not null,
  user_id uuid,
  created_at timestamptz default now()
);

create table if not exists onboarding_leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'doctor',
  full_name text not null,
  specialization text,
  qualifications text,
  city text,
  locality text,
  pincode text,
  clinic_name text,
  address text,
  phone text,
  alt_phone text,
  email text,
  website text,
  registration_no text,
  council text,
  source text,
  source_url text,
  rating numeric(2,1),
  experience_years integer,
  raw_json text,
  status text not null default 'new',
  assigned_to_user_id uuid,
  call_notes text,
  dedupe_key text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists uq_lead_dedupe on onboarding_leads (dedupe_key);
create index if not exists idx_lead_kind_status on onboarding_leads (kind, status);

create table if not exists provider_verifications (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid,
  lead_id uuid,
  doc_type text not null,
  file_url text,
  ocr_name text,
  ocr_registration_no text,
  ocr_council text,
  ocr_raw_text text,
  registry_status text default 'unchecked',
  registry_url text,
  registry_notes text,
  verdict text default 'pending',
  verified_by_user_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists service_visits (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid,
  patient_name text not null,
  patient_phone text not null,
  service_type text not null,
  service_name text,
  address text not null,
  pincode text,
  lat numeric(9,6),
  lng numeric(9,6),
  scheduled_at timestamptz,
  assigned_professional_id uuid,
  status text not null default 'requested',
  staff_lat numeric(9,6),
  staff_lng numeric(9,6),
  eta_minutes integer,
  tracking_updated_at timestamptz,
  visit_summary text,
  fee_inr integer,
  payment_id uuid,
  rating integer,
  feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_visit_status on service_visits (status);
create index if not exists idx_visit_staff on service_visits (assigned_professional_id);

create table if not exists delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  medicine_order_id uuid,
  pharmacy_professional_id uuid,
  delivery_person_name text,
  delivery_person_phone text,
  status text not null default 'pending',
  lat numeric(9,6),
  lng numeric(9,6),
  tracking_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid,
  payment_id uuid,
  gross_inr integer not null,
  commission_inr integer not null default 0,
  net_inr integer not null,
  status text not null default 'pending',
  provider_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid,
  anon_id text,
  city text,
  pincode text,
  path text,
  props text,
  created_at timestamptz default now()
);
create index if not exists idx_analytics_name_time on analytics_events (name, created_at);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  token text not null,
  platform text default 'web',
  last_lat numeric(9,6),
  last_lng numeric(9,6),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists uq_push_token on push_tokens (token);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null,
  code text not null,
  referred_user_id uuid,
  status text default 'pending',
  reward_inr integer default 0,
  created_at timestamptz default now()
);
create index if not exists idx_referral_code on referrals (code);

-- AI chat (from 0003.5 / schema) — ensure present
create table if not exists ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  channel text default 'web',
  suggested_specialty text,
  emergency_flagged boolean default false,
  live_model boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Seed launch pincodes (Lucknow core) so serviceability works out of the box.
insert into serviceable_areas (city, pincode, locality, service, status) values
  ('Lucknow','226010','Gomtinagar','medicine','live'),
  ('Lucknow','226010','Gomtinagar','lab','live'),
  ('Lucknow','226010','Gomtinagar','nursing','live'),
  ('Lucknow','226010','Gomtinagar','physio','live'),
  ('Lucknow','226010','Gomtinagar','vitals','live'),
  ('Lucknow','226010','Gomtinagar','clinic','live'),
  ('Lucknow','226001','Hazratganj','medicine','live'),
  ('Lucknow','226001','Hazratganj','lab','live'),
  ('Lucknow','226001','Hazratganj','vitals','live'),
  ('Lucknow','226001','Hazratganj','clinic','live')
on conflict (pincode, service) do nothing;
