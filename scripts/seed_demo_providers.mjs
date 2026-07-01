// Seed a demo DOCTOR and demo NURSE with verified provider accounts and
// populated dashboards (appointments, availability, earnings, home visits).
// Idempotent: clears prior demo data for these two accounts and reseeds.
//
// Usage: DATABASE_URL=... node scripts/seed_demo_providers.mjs
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
const sql = neon(url);
const pwHash = bcrypt.hashSync("Provider@2026", 10);
const today = new Date();
const dayStr = (delta) => { const d = new Date(today); d.setDate(today.getDate() + delta); return d.toISOString().split("T")[0]; };

async function upsertUser(email, name, phone, gender) {
  const [u] = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (u) {
    await sql`UPDATE users SET name=${name}, password_hash=${pwHash}, role='provider', email_verified=now(), phone=${phone}, gender=${gender} WHERE id=${u.id}`;
    return u.id;
  }
  const [r] = await sql`INSERT INTO users (email, name, password_hash, role, email_verified, phone, gender) VALUES (${email}, ${name}, ${pwHash}, 'provider', now(), ${phone}, ${gender}) RETURNING id`;
  return r.id;
}

async function upsertProfessional(userId, fields) {
  const [p] = await sql`SELECT id FROM professionals WHERE user_id = ${userId} LIMIT 1`;
  if (p) {
    await sql`UPDATE professionals SET full_name=${fields.fullName}, phone=${fields.phone}, gender=${fields.gender}, role=${fields.role}, specialization=${fields.specialization}, experience_years=${fields.exp}, city='Lucknow', pincode=${fields.pincode}, status='verified', services=${fields.services}, languages=${["Hindi","English"]}, daily_rate=${fields.rate} WHERE id=${p.id}`;
    return p.id;
  }
  const [r] = await sql`INSERT INTO professionals (user_id, full_name, phone, gender, role, specialization, experience_years, city, pincode, status, services, languages, daily_rate)
    VALUES (${userId}, ${fields.fullName}, ${fields.phone}, ${fields.gender}, ${fields.role}, ${fields.specialization}, ${fields.exp}, 'Lucknow', ${fields.pincode}, 'verified', ${fields.services}, ${["Hindi","English"]}, ${fields.rate}) RETURNING id`;
  return r.id;
}

// ---------- DOCTOR ----------
const docUserId = await upsertUser("demo-doctor@hanuone.com", "Asha Sharma", "+919000010001", "female");
const docProfId = await upsertProfessional(docUserId, { fullName: "Asha Sharma", phone: "+919000010001", gender: "female", role: "doctor", specialization: "General Physician", exp: 11, pincode: "226010", services: ["Consult","Fever","Diabetes","BP"], rate: 600 });

await sql`DELETE FROM earnings WHERE professional_id = ${docProfId}`;
await sql`DELETE FROM bookings WHERE professional_id = ${docProfId}`;
await sql`DELETE FROM availability WHERE professional_id = ${docProfId}`;

for (let i = 0; i < 10; i++) {
  const d = new Date(today); d.setDate(today.getDate() + i);
  if (d.getDay() === 0) continue;
  const date = d.toISOString().split("T")[0];
  await sql`INSERT INTO availability (professional_id, date, start_time, end_time) VALUES (${docProfId}, ${date}, '10:00', '13:00')`;
  await sql`INSERT INTO availability (professional_id, date, start_time, end_time) VALUES (${docProfId}, ${date}, '17:00', '20:00')`;
}

const docBookings = [
  { name: "Ramesh Pandey", phone: "+919876500011", addr: "Gomtinagar", svc: "Consult", date: dayStr(-3), s: "10:00", e: "10:20", st: "completed", amt: 600, pay: "paid", notes: "Diabetes review." },
  { name: "Sunita Verma", phone: "+919876500012", addr: "Aliganj", svc: "Consult", date: dayStr(0), s: "11:00", e: "11:20", st: "confirmed", amt: 600, pay: "paid", notes: "Fever 3 days." },
  { name: "Imran Khan", phone: "+919876500013", addr: "Hazratganj", svc: "Consult", date: dayStr(0), s: "17:30", e: "17:50", st: "pending", amt: 600, pay: "unpaid", notes: "BP follow-up." },
  { name: "Neha Singh", phone: "+919876500014", addr: "Indira Nagar", svc: "Consult", date: dayStr(2), s: "10:30", e: "10:50", st: "confirmed", amt: 600, pay: "paid", notes: "" }
];
for (const b of docBookings) {
  await sql`INSERT INTO bookings (professional_id, patient_name, patient_phone, patient_address, service_type, booking_date, start_time, end_time, status, amount, payment_status, notes)
    VALUES (${docProfId}, ${b.name}, ${b.phone}, ${b.addr}, ${b.svc}, ${b.date}, ${b.s}, ${b.e}, ${b.st}, ${b.amt}, ${b.pay}, ${b.notes})`;
}
await sql`INSERT INTO earnings (professional_id, amount, type, description, created_at) VALUES (${docProfId}, 600, 'credit', 'Completed: Consult (Ramesh Pandey)', ${new Date(dayStr(-3))})`;
await sql`INSERT INTO earnings (professional_id, amount, type, description, created_at) VALUES (${docProfId}, 1200, 'payout', 'Weekly payout to bank', ${new Date(Date.now() - 5*86400000)})`;

// ---------- NURSE ----------
const nurseUserId = await upsertUser("demo-nurse@hanuone.com", "Pooja Yadav", "+919000010002", "female");
const nurseProfId = await upsertProfessional(nurseUserId, { fullName: "Pooja Yadav", phone: "+919000010002", gender: "female", role: "nurse", specialization: "Home nursing", exp: 6, pincode: "226016", services: ["Vitals","Injection","Wound care","Elder care"], rate: 1200 });

await sql`DELETE FROM earnings WHERE professional_id = ${nurseProfId}`;
await sql`DELETE FROM service_visits WHERE assigned_professional_id = ${nurseProfId}`;

const visits = [
  { name: "Geeta Devi", phone: "+919876500021", svc: "vitals", svcName: "Vital Checkup (home nurse)", addr: "B-22, Gomtinagar", pin: "226010", status: "assigned", gender: "female" },
  { name: "Mohan Lal", phone: "+919876500022", svc: "nursing", svcName: "Wound dressing", addr: "44, Aliganj Sector C", pin: "226024", status: "arrived", gender: "male" },
  { name: "Kavita Rao", phone: "+919876500023", svc: "vitals", svcName: "Vital Checkup (home nurse)", addr: "Mahanagar", pin: "226006", status: "completed", gender: "female" }
];
for (const v of visits) {
  await sql`INSERT INTO service_visits (patient_name, patient_phone, service_type, service_name, address, pincode, scheduled_at, assigned_professional_id, status, customer_gender, assignment_reason)
    VALUES (${v.name}, ${v.phone}, ${v.svc}, ${v.svcName}, ${v.addr}, ${v.pin}, ${new Date(dayStr(0))}, ${nurseProfId}, ${v.status}, ${v.gender}, 'Same-gender match (female nurse)')`;
}
await sql`INSERT INTO earnings (professional_id, amount, type, description, created_at) VALUES (${nurseProfId}, 800, 'credit', 'Completed: Vital Checkup (Kavita Rao)', ${new Date(dayStr(-1))})`;

console.log("Seeded demo providers:");
console.log("  Doctor: demo-doctor@hanuone.com / Provider@2026  (4 appts, availability, earnings)");
console.log("  Nurse:  demo-nurse@hanuone.com / Provider@2026   (3 visits incl. vitals)");
