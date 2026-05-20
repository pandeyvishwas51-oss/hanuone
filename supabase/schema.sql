-- ============================================================
-- Hanuone, Supabase schema
-- Run inside Supabase SQL editor (Project → SQL → New query)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Doctors
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_hindi TEXT,
  slug TEXT UNIQUE NOT NULL,
  specialization TEXT NOT NULL,
  specialization_hindi TEXT,
  sub_specializations TEXT[],
  qualifications TEXT[],
  experience_years INTEGER,
  clinic_name TEXT,
  clinic_address TEXT NOT NULL,
  locality TEXT NOT NULL,
  city TEXT DEFAULT 'Lucknow',
  pincode TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone TEXT,
  whatsapp TEXT,
  consultation_fee_min INTEGER,
  consultation_fee_max INTEGER,
  timing TEXT,
  languages TEXT[] DEFAULT ARRAY['Hindi', 'English'],
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,
  profile_image_url TEXT,
  verified BOOLEAN DEFAULT false,
  source TEXT,
  source_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Specializations
-- ============================================================
CREATE TABLE IF NOT EXISTS specializations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  name_hindi TEXT,
  icon TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  doctor_count INTEGER DEFAULT 0
);

-- ============================================================
-- Localities
-- ============================================================
CREATE TABLE IF NOT EXISTS localities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  name_hindi TEXT,
  slug TEXT UNIQUE NOT NULL,
  doctor_count INTEGER DEFAULT 0,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8)
);

-- ============================================================
-- Reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  reviewer_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Waitlist
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  whatsapp TEXT,
  city_of_residence TEXT,
  parents_city TEXT DEFAULT 'Lucknow',
  interest TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS doctors_search_idx ON doctors
  USING GIN(to_tsvector('english',
    coalesce(name,'') || ' ' ||
    coalesce(specialization,'') || ' ' ||
    coalesce(clinic_address,'') || ' ' ||
    coalesce(locality,'')
  ));

CREATE INDEX IF NOT EXISTS doctors_name_trgm_idx ON doctors USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS doctors_specialization_idx ON doctors (specialization);
CREATE INDEX IF NOT EXISTS doctors_locality_idx ON doctors (locality);
CREATE INDEX IF NOT EXISTS doctors_active_idx ON doctors (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS doctors_rating_idx ON doctors (rating DESC NULLS LAST);

-- ============================================================
-- Trigger: keep updated_at fresh
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doctors_updated_at ON doctors;
CREATE TRIGGER doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Helper: refresh doctor counts on specializations + localities
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_doctor_counts()
RETURNS void AS $$
BEGIN
  UPDATE specializations s
  SET doctor_count = sub.cnt
  FROM (
    SELECT specialization, COUNT(*)::int AS cnt
    FROM doctors WHERE is_active = true
    GROUP BY specialization
  ) sub
  WHERE s.name = sub.specialization;

  UPDATE specializations SET doctor_count = 0
  WHERE name NOT IN (SELECT DISTINCT specialization FROM doctors WHERE is_active = true);

  UPDATE localities l
  SET doctor_count = sub.cnt
  FROM (
    SELECT locality, COUNT(*)::int AS cnt
    FROM doctors WHERE is_active = true
    GROUP BY locality
  ) sub
  WHERE l.name = sub.locality;

  UPDATE localities SET doctor_count = 0
  WHERE name NOT IN (SELECT DISTINCT locality FROM doctors WHERE is_active = true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Row Level Security, public read, no public write
-- ============================================================
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE localities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctors public read" ON doctors;
CREATE POLICY "doctors public read" ON doctors FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "specializations public read" ON specializations;
CREATE POLICY "specializations public read" ON specializations FOR SELECT USING (true);

DROP POLICY IF EXISTS "localities public read" ON localities;
CREATE POLICY "localities public read" ON localities FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews public read" ON reviews;
CREATE POLICY "reviews public read" ON reviews FOR SELECT USING (true);

-- Anyone can submit a review or join waitlist (write-only via anon key)
DROP POLICY IF EXISTS "reviews public insert" ON reviews;
CREATE POLICY "reviews public insert" ON reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "waitlist public insert" ON waitlist;
CREATE POLICY "waitlist public insert" ON waitlist FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "waitlist count read" ON waitlist;
CREATE POLICY "waitlist count read" ON waitlist FOR SELECT USING (true);
