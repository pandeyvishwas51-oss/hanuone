-- ============================================================
-- Hanuone — Migration 0003: Medicine delivery + Lab tests
-- Run after 0002_transacting.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS medicine_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  pincode TEXT,
  city TEXT,
  prescription_url TEXT,
  items TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'placed',
  amount_inr INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS medicine_orders_patient_idx ON medicine_orders (patient_user_id);

CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  sample_type TEXT,
  tat_hours INTEGER,
  price_inr INTEGER,
  home_collection BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  test_id UUID REFERENCES lab_tests(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  address TEXT,
  pincode TEXT,
  city TEXT,
  collection_type TEXT DEFAULT 'home',
  slot_date DATE,
  slot_time TEXT,
  status TEXT NOT NULL DEFAULT 'booked',
  report_url TEXT,
  amount_inr INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lab_orders_patient_idx ON lab_orders (patient_user_id);

-- RLS (server-only writes; lab catalog is public-readable)
ALTER TABLE medicine_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lab_tests public read" ON lab_tests;
CREATE POLICY "lab_tests public read" ON lab_tests FOR SELECT USING (is_active = true);

-- Seed a starter lab catalog
INSERT INTO lab_tests (name, slug, category, description, sample_type, tat_hours, price_inr) VALUES
  ('Complete Blood Count (CBC)', 'cbc', 'Routine', 'Measures red cells, white cells, haemoglobin and platelets.', 'Blood', 24, 350),
  ('Lipid Profile', 'lipid-profile', 'Routine', 'Cholesterol, triglycerides, HDL and LDL.', 'Blood', 24, 600),
  ('HbA1c (Diabetes)', 'hba1c', 'Routine', '3-month average blood sugar.', 'Blood', 24, 500),
  ('Thyroid Profile (T3 T4 TSH)', 'thyroid-profile', 'Routine', 'Thyroid function panel.', 'Blood', 24, 550),
  ('Liver Function Test (LFT)', 'lft', 'Routine', 'Assesses liver health.', 'Blood', 24, 700),
  ('Kidney Function Test (KFT)', 'kft', 'Routine', 'Assesses kidney health.', 'Blood', 24, 700),
  ('Vitamin D', 'vitamin-d', 'Routine', '25-OH Vitamin D level.', 'Blood', 48, 1200),
  ('Full Body Checkup', 'full-body-checkup', 'Package', '60+ parameters covering vitals, organs and metabolism.', 'Blood + Urine', 48, 1499)
ON CONFLICT (slug) DO NOTHING;
