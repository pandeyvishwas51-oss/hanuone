-- HanuonePro schema (Neon Postgres)

-- Users (Auth.js managed)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMPTZ,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth.js helper tables
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Professionals
CREATE TABLE IF NOT EXISTS professionals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('doctor','nurse','ward_boy','caregiver','physiotherapist','agency')),
  specialization TEXT,
  qualifications TEXT[],
  experience_years INTEGER,
  bio TEXT,
  profile_photo_url TEXT,
  aadhaar_url TEXT,
  certificate_urls TEXT[],
  locality TEXT,
  city TEXT DEFAULT 'Lucknow',
  pincode TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  hourly_rate INTEGER,
  daily_rate INTEGER,
  services TEXT[],
  languages TEXT[] DEFAULT ARRAY['Hindi','English'],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','suspended')),
  rejection_reason TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability slots
CREATE TABLE IF NOT EXISTS availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_address TEXT,
  service_type TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  notes TEXT,
  amount INTEGER,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','partial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Earnings ledger
CREATE TABLE IF NOT EXISTS earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT DEFAULT 'credit' CHECK (type IN ('credit','debit','payout')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prof_user_idx ON professionals(user_id);
CREATE INDEX IF NOT EXISTS prof_status_idx ON professionals(status);
CREATE INDEX IF NOT EXISTS avail_prof_date_idx ON availability(professional_id, date);
CREATE INDEX IF NOT EXISTS bookings_prof_idx ON bookings(professional_id, booking_date);

CREATE OR REPLACE FUNCTION set_pro_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prof_updated ON professionals;
CREATE TRIGGER prof_updated BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION set_pro_updated_at();

DROP TRIGGER IF EXISTS bookings_updated ON bookings;
CREATE TRIGGER bookings_updated BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_pro_updated_at();
