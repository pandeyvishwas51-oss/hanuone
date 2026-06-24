-- ============================================================
-- Hanuone — Migration 0002: transacting MVP
-- Auth evolution + consult lifecycle + payments + vitals + audit
-- Run in Supabase SQL editor AFTER schema.sql + hanuonepro/supabase/schema.sql
-- ============================================================

-- ── Evolve users for phone-first (MSG91 OTP) auth ───────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'patient';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users (phone) WHERE phone IS NOT NULL;

-- ── Bookable doctor slots ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'video',
  fee_inr INTEGER,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_slots_doctor_date_idx ON provider_slots (doctor_id, date);

-- ── Consent records (NMC telemedicine + DPDP) ───────────────────────
CREATE TABLE IF NOT EXISTS consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  consultation_id UUID,
  type TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  consent_text TEXT NOT NULL,
  patient_identity TEXT,
  rmp_identity TEXT,
  mode TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Consultations (7 NMC record elements + lifecycle) ───────────────
CREATE TABLE IF NOT EXISTS consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  patient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES provider_slots(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'video',
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  context TEXT,
  evaluation_notes TEXT,
  management_plan TEXT,
  video_room TEXT,
  fee_inr INTEGER,
  consent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS consultations_patient_idx ON consultations (patient_user_id);
CREATE INDEX IF NOT EXISTS consultations_doctor_idx ON consultations (doctor_id);
CREATE INDEX IF NOT EXISTS consultations_status_idx ON consultations (status);

-- ── E-prescriptions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  patient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  nmc_reg_no TEXT,
  qualification TEXT,
  diagnosis TEXT,
  medications TEXT,
  instructions TEXT,
  pdf_url TEXT,
  is_follow_up BOOLEAN DEFAULT false,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payments (Razorpay) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_type TEXT NOT NULL,
  order_id UUID,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  amount_inr INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created',
  refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_type, order_id);

-- ── Vital Checkup (USP) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vital_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  reason TEXT,
  allergies TEXT,
  current_meds TEXT,
  history TEXT,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  heart_rate INTEGER,
  spo2 INTEGER,
  temperature_c DECIMAL(4,1),
  random_blood_sugar INTEGER,
  weight_kg DECIMAL(5,1),
  height_cm DECIMAL(5,1),
  respiratory_rate INTEGER,
  pain_scale INTEGER,
  flags TEXT,
  provider_notes TEXT,
  report_pdf_url TEXT,
  escalated BOOLEAN DEFAULT false,
  visited_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vital_visits_patient_idx ON vital_visits (patient_user_id, visited_at DESC);

-- ── Append-only audit log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  meta TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity, entity_id);

-- ============================================================
-- Row Level Security
-- Service-role (server) bypasses RLS; these protect the anon key.
-- ============================================================
ALTER TABLE provider_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can read open slots (for discovery); writes are server-only.
DROP POLICY IF EXISTS "slots public read" ON provider_slots;
CREATE POLICY "slots public read" ON provider_slots FOR SELECT USING (is_booked = false);

-- Health/payment/consent tables: no anon access at all. All access via
-- service-role on the server, which enforces per-user checks in code.
-- (No SELECT/INSERT policies created → anon denied by default under RLS.)

-- audit_logs: append-only, never readable/updatable by anon.
-- (No policies → denied to anon; server uses service role.)
