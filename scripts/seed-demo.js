// One-off: create demo accounts for end-to-end testing.
// Run: DATABASE_URL=... node scripts/seed-demo.js
const { neon } = require("@neondatabase/serverless");
const bcrypt = require("bcryptjs");

const sql = neon(process.env.DBURL || process.env.DATABASE_URL);
const PW = "Demo@1234";
const hash = bcrypt.hashSync(PW, 10);

async function upsertUser({ email, name, phone, role, isAdmin }) {
  const rows = await sql`
    insert into users (email, name, phone, password_hash, role, is_admin, email_verified, auth_provider)
    values (${email}, ${name}, ${phone}, ${hash}, ${role}, ${isAdmin}, now(), 'email')
    on conflict (email) do update set
      name = excluded.name, phone = excluded.phone, password_hash = excluded.password_hash,
      role = excluded.role, is_admin = excluded.is_admin, email_verified = now()
    returning id`;
  return rows[0].id;
}

(async () => {
  try {
    // 1) Patient
    const patientId = await upsertUser({ email: "patient@hanuone.test", name: "Demo Patient", phone: "9990000001", role: "patient", isAdmin: false });

    // 2) Admin
    const adminId = await upsertUser({ email: "admin@hanuone.test", name: "Demo Admin", phone: "9990000004", role: "admin", isAdmin: true });

    // 3) Doctor (provider) + linked catalog row
    const doctorUserId = await upsertUser({ email: "doctor@hanuone.test", name: "Dr. Demo Sharma", phone: "9990000002", role: "provider", isAdmin: false });
    await sql`
      insert into doctors (user_id, name, slug, specialization, qualifications, experience_years, clinic_name, clinic_address, locality, city, pincode, phone, whatsapp, consultation_fee_min, consultation_fee_max, timing, languages, rating, review_count, is_active, verified)
      values (${doctorUserId}, 'Dr. Demo Sharma', 'dr-demo-sharma-general-physician-demo', 'General Physician', ${["MBBS","MD"]}, 12, 'HanuONE Demo Clinic', 'Demo Clinic, Gomti Nagar, Lucknow', 'Gomti Nagar', 'Lucknow', '226010', '9990000002', '9990000002', 400, 600, 'Mon-Sat 10am-6pm', ${["Hindi","English"]}, 4.8, 42, true, true)
      on conflict (user_id) do update set is_active = true, verified = true, consultation_fee_min = 400, consultation_fee_max = 600`;

    // 4) Nurse (provider) + verified professional
    const nurseUserId = await upsertUser({ email: "nurse@hanuone.test", name: "Demo Nurse", phone: "9990000003", role: "provider", isAdmin: false });
    await sql`
      insert into professionals (user_id, full_name, phone, email, gender, role, specialization, experience_years, locality, city, pincode, services, languages, status, is_available)
      values (${nurseUserId}, 'Demo Nurse', '9990000003', 'nurse@hanuone.test', 'female', 'nurse', 'Home Nursing', 6, 'Gomti Nagar', 'Lucknow', '226010', ${["injection","vitals","elderly_care"]}, ${["Hindi","English"]}, 'verified', true)
      on conflict (user_id) do update set status = 'verified', is_available = true`;

    console.log("SEED_OK");
    console.log(JSON.stringify({ patientId, adminId, doctorUserId, nurseUserId, password: PW }, null, 2));
  } catch (e) {
    console.log("SEED_ERR", e.message);
  }
})();
