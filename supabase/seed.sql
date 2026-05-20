-- ============================================================
-- Hanuone, Seed data (specializations, localities, 5 doctors)
-- Run AFTER schema.sql
-- ============================================================

-- Specializations
INSERT INTO specializations (name, name_hindi, slug, icon) VALUES
  ('Cardiologist', 'हृदय रोग विशेषज्ञ', 'cardiologist', '❤️'),
  ('Orthopedic', 'हड्डी रोग विशेषज्ञ', 'orthopedic', '🦴'),
  ('Pediatrician', 'बाल रोग विशेषज्ञ', 'pediatrician', '👶'),
  ('Gynecologist', 'स्त्री रोग विशेषज्ञ', 'gynecologist', '🏥'),
  ('Dermatologist', 'त्वचा रोग विशेषज्ञ', 'dermatologist', '🌟'),
  ('Neurologist', 'न्यूरोलॉजिस्ट', 'neurologist', '🧠'),
  ('Diabetologist', 'मधुमेह विशेषज्ञ', 'diabetologist', '💉'),
  ('ENT Specialist', 'नाक, कान, गला विशेषज्ञ', 'ent', '👂'),
  ('Ophthalmologist', 'नेत्र रोग विशेषज्ञ', 'ophthalmologist', '👁️'),
  ('General Physician', 'सामान्य चिकित्सक', 'general-physician', '👨‍⚕️'),
  ('Urologist', 'मूत्र रोग विशेषज्ञ', 'urologist', '🚻'),
  ('Psychiatrist', 'मनोचिकित्सक', 'psychiatrist', '🧠'),
  ('Physiotherapist', 'फिजियोथेरेपिस्ट', 'physiotherapist', '💪'),
  ('Oncologist', 'कैंसर विशेषज्ञ', 'oncologist', '🎗️'),
  ('Gastroenterologist', 'पेट रोग विशेषज्ञ', 'gastroenterologist', '🩺')
ON CONFLICT (slug) DO NOTHING;

-- Localities
INSERT INTO localities (name, name_hindi, slug) VALUES
  ('Gomtinagar', 'गोमतीनगर', 'gomtinagar'),
  ('Civil Lines', 'सिविल लाइंस', 'civil-lines'),
  ('Hazratganj', 'हजरतगंज', 'hazratganj'),
  ('Aliganj', 'अलीगंज', 'aliganj'),
  ('Indira Nagar', 'इंदिरा नगर', 'indira-nagar'),
  ('Alambagh', 'आलमबाग', 'alambagh'),
  ('Mahanagar', 'महानगर', 'mahanagar'),
  ('Rajajipuram', 'राजाजीपुरम', 'rajajipuram'),
  ('Vikas Nagar', 'विकास नगर', 'vikas-nagar'),
  ('Jankipuram', 'जानकीपुरम', 'jankipuram'),
  ('Charbagh', 'चारबाग', 'charbagh'),
  ('Aminabad', 'अमीनाबाद', 'aminabad'),
  ('Kapoorthala', 'कपूरथला', 'kapoorthala'),
  ('Butler Colony', 'बटलर कॉलोनी', 'butler-colony'),
  ('Nishatganj', 'निशातगंज', 'nishatganj'),
  ('BKT Road', 'बीकेटी रोड', 'bkt-road')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 5 sample doctors (manual seed for UI testing)
-- ============================================================
INSERT INTO doctors (
  name, slug, specialization, qualifications, experience_years,
  clinic_name, clinic_address, locality, phone, whatsapp,
  consultation_fee_min, consultation_fee_max, timing,
  rating, review_count, verified, source
) VALUES
  (
    'Dr. Rajesh Kumar Sharma',
    'dr-rajesh-kumar-sharma-cardiologist-gomtinagar',
    'Cardiologist',
    ARRAY['MBBS', 'MD Medicine', 'DM Cardiology'],
    18,
    'Heart Care Clinic',
    '45 Viram Khand, Gomtinagar, Lucknow',
    'Gomtinagar',
    '+91-522-4001234',
    '+919876543210',
    600, 1000,
    'Mon-Sat: 10am-2pm, 5pm-8pm',
    4.8, 142, true, 'manual'
  ),
  (
    'Dr. Anjali Verma',
    'dr-anjali-verma-gynecologist-hazratganj',
    'Gynecologist',
    ARRAY['MBBS', 'MS Obstetrics & Gynaecology'],
    14,
    'Mother & Child Care Centre',
    '12 Shahnajaf Road, Hazratganj, Lucknow',
    'Hazratganj',
    '+91-522-4002345',
    '+919876543211',
    500, 800,
    'Mon-Sat: 11am-3pm, 6pm-9pm',
    4.7, 98, true, 'manual'
  ),
  (
    'Dr. Sandeep Tiwari',
    'dr-sandeep-tiwari-orthopedic-aliganj',
    'Orthopedic',
    ARRAY['MBBS', 'MS Orthopaedics', 'Fellowship Joint Replacement'],
    20,
    'Lucknow Bone & Joint Hospital',
    'Sector H, Aliganj, Lucknow',
    'Aliganj',
    '+91-522-4003456',
    '+919876543212',
    700, 1200,
    'Mon-Fri: 10am-1pm, 5pm-8pm',
    4.6, 187, true, 'manual'
  ),
  (
    'Dr. Priya Mishra',
    'dr-priya-mishra-pediatrician-indira-nagar',
    'Pediatrician',
    ARRAY['MBBS', 'MD Pediatrics'],
    11,
    'Little Stars Child Clinic',
    'Sector 14, Indira Nagar, Lucknow',
    'Indira Nagar',
    '+91-522-4004567',
    '+919876543213',
    400, 600,
    'Mon-Sun: 9am-1pm, 4pm-8pm',
    4.9, 215, true, 'manual'
  ),
  (
    'Dr. Mohit Agarwal',
    'dr-mohit-agarwal-dermatologist-mahanagar',
    'Dermatologist',
    ARRAY['MBBS', 'MD Dermatology'],
    9,
    'Skin & Hair Solutions',
    'C-Block, Mahanagar, Lucknow',
    'Mahanagar',
    '+91-522-4005678',
    '+919876543214',
    600, 900,
    'Tue-Sun: 11am-2pm, 5pm-9pm',
    4.5, 76, true, 'manual'
  )
ON CONFLICT (slug) DO NOTHING;

-- Refresh counts after seeding
SELECT refresh_doctor_counts();
