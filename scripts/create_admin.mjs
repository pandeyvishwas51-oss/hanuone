// Bootstrap an admin user. Usage:
//   DATABASE_URL=... node scripts/create_admin.mjs admin@hanuone.in 'StrongPassword123!'
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}
const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: node create_admin.mjs <email> <password>");
  process.exit(1);
}
const sql = neon(url);
const passwordHash = bcrypt.hashSync(password, 10);

const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
if (existing.length) {
  await sql`UPDATE users SET is_admin = true, password_hash = ${passwordHash}, name = ${"Hanuone Admin"} WHERE email = ${email.toLowerCase()}`;
  console.log(`Updated existing user ${email} -> admin`);
} else {
  const r = await sql`INSERT INTO users (email, name, password_hash, is_admin) VALUES (${email.toLowerCase()}, ${"Hanuone Admin"}, ${passwordHash}, true) RETURNING id`;
  console.log(`Created admin ${email}, id=${r[0].id}`);
}
