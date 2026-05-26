// Populate the demo doctor's dashboard with realistic data so the founders see
// the experience end-to-end. Idempotent — clears prior demo data and reseeds.
//
// Usage:
//   DATABASE_URL=... node scripts/seed_demo_doctor.mjs demo-doctor@hanuone.in
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL"); process.exit(1); }
const email = (process.argv[2] || "demo-doctor@hanuone.in").toLowerCase();

const sql = neon(url);

// 1. Look up the user + professional
const [user] = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
if (!user) { console.error(`User ${email} not found. Register first.`); process.exit(1); }

const [prof] = await sql`SELECT id FROM professionals WHERE user_id = ${user.id} LIMIT 1`;
if (!prof) { console.error("Professional row not found."); process.exit(1); }

// 2. Mark verified
await sql`
  UPDATE professionals
  SET status = 'verified',
      bio = 'Senior cardiologist with 12+ years of experience treating heart conditions, hypertension, and post-surgical recovery. Member of the Cardiological Society of India.',
      city = 'Lucknow',
      pincode = '226010',
      languages = ARRAY['Hindi','English','Awadhi'],
      services = ARRAY['Echo','ECG','TMT','Holter','Cardiac Consult'],
      qualifications = ARRAY['MBBS','MD Medicine','DM Cardiology'],
      daily_rate = 4500
  WHERE id = ${prof.id}
`;

// 3. Clear and reseed availability for the next 14 days
await sql`DELETE FROM availability WHERE professional_id = ${prof.id}`;
const today = new Date();
for (let i = 0; i < 14; i++) {
  const d = new Date(today); d.setDate(today.getDate() + i);
  const dow = d.getDay();
  if (dow === 0) continue; // skip Sundays
  const date = d.toISOString().split("T")[0];
  await sql`INSERT INTO availability (professional_id, date, start_time, end_time) VALUES (${prof.id}, ${date}, '09:00', '13:00')`;
  await sql`INSERT INTO availability (professional_id, date, start_time, end_time) VALUES (${prof.id}, ${date}, '17:00', '20:00')`;
}

// 4. Clear and reseed bookings (mix of statuses)
await sql`DELETE FROM bookings WHERE professional_id = ${prof.id}`;

const dayStr = (delta) => {
  const d = new Date(today); d.setDate(today.getDate() + delta);
  return d.toISOString().split("T")[0];
};

const bookings = [
  { name: "Anjali Verma",     phone: "+919876543210", addr: "B-12, Vinay Khand, Gomtinagar", svc: "Cardiac Consult", date: dayStr(-7), start: "10:00", end: "10:30", status: "completed",  amt: 600,  pay: "paid",   notes: "BP review post-op." },
  { name: "Ramesh Pandey",    phone: "+919876543212", addr: "44, Aliganj Sector C",           svc: "Echo + ECG",      date: dayStr(-5), start: "11:00", end: "12:00", status: "completed",  amt: 1200, pay: "paid",   notes: "Echo normal, follow-up in 3 mo." },
  { name: "Sushma Tripathi",  phone: "+919876543213", addr: "8/7, Indira Nagar Sector 14",    svc: "TMT",             date: dayStr(-3), start: "17:30", end: "18:15", status: "completed",  amt: 900,  pay: "paid",   notes: "TMT positive, advised angiography." },
  { name: "Mohit Agarwal",    phone: "+919876543214", addr: "Mahanagar C-Block",              svc: "Cardiac Consult", date: dayStr(-1), start: "12:00", end: "12:30", status: "in_progress", amt: 600, pay: "unpaid", notes: "Repeat patient." },
  { name: "Priya Mishra",     phone: "+919876543215", addr: "12, Hazratganj",                 svc: "Cardiac Consult", date: dayStr(0),  start: "10:00", end: "10:30", status: "confirmed",   amt: 600, pay: "unpaid", notes: "First visit, palpitations." },
  { name: "Sandeep Yadav",    phone: "+919876543216", addr: "Jankipuram Extension",           svc: "Echo",            date: dayStr(1),  start: "11:00", end: "11:45", status: "confirmed",   amt: 1200, pay: "unpaid", notes: "Family history of CAD." },
  { name: "Neha Srivastava",  phone: "+919876543217", addr: "Ashiyana, near LDA",             svc: "Cardiac Consult", date: dayStr(2),  start: "17:30", end: "18:00", status: "pending",     amt: 600, pay: "unpaid", notes: "" },
  { name: "Karan Malhotra",   phone: "+919876543218", addr: "Vrindavan Yojana",               svc: "Holter Monitor",  date: dayStr(3),  start: "10:00", end: "11:00", status: "pending",     amt: 1500, pay: "unpaid", notes: "Sent from main hospital." }
];

for (const b of bookings) {
  await sql`
    INSERT INTO bookings (professional_id, patient_name, patient_phone, patient_address, service_type, booking_date, start_time, end_time, status, amount, payment_status, notes)
    VALUES (${prof.id}, ${b.name}, ${b.phone}, ${b.addr}, ${b.svc}, ${b.date}, ${b.start}, ${b.end}, ${b.status}, ${b.amt}, ${b.pay}, ${b.notes})
  `;
}

// 5. Clear and reseed earnings — credits for completed bookings + a payout
await sql`DELETE FROM earnings WHERE professional_id = ${prof.id}`;

const completed = bookings.filter((b) => b.status === "completed");
for (const b of completed) {
  await sql`
    INSERT INTO earnings (professional_id, amount, type, description, created_at)
    VALUES (${prof.id}, ${b.amt}, 'credit', ${`Booking completed: ${b.svc} (${b.name})`}, ${new Date(b.date)})
  `;
}
await sql`
  INSERT INTO earnings (professional_id, amount, type, description, created_at)
  VALUES (${prof.id}, 1500, 'payout', 'Weekly payout to bank account', ${new Date(Date.now() - 4 * 86400_000)})
`;

console.log(`Seeded demo doctor ${email}`);
console.log(`Bookings: ${bookings.length}, Completed: ${completed.length}, Status: verified`);
