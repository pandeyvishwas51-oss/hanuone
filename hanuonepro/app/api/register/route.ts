import { NextResponse } from "next/server";
import { hash } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const runtime = "nodejs";

type Payload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: string;
  specialization?: string;
  experienceYears?: number | null;
  locality?: string;
  hourlyRate?: number | null;
};

export async function POST(req: Request) {
  let body: Partial<Payload> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const password = String(body.password || "");
  const role = (body.role || "").trim();

  if (!fullName) return NextResponse.json({ ok: false, error: "Full name required" }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ ok: false, error: "Password must be 6+ chars" }, { status: 400 });
  if (!phone) return NextResponse.json({ ok: false, error: "Phone required" }, { status: 400 });
  if (!role) return NextResponse.json({ ok: false, error: "Role required" }, { status: 400 });

  // Check if email already exists
  const [existing] = await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ ok: false, error: "Email already registered. Try logging in." }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  // Create user
  const [user] = await db()
    .insert(schema.users)
    .values({
      email,
      name: fullName,
      passwordHash
    })
    .returning();

  if (!user) return NextResponse.json({ ok: false, error: "Could not create account" }, { status: 500 });

  // Create professional profile
  await db().insert(schema.professionals).values({
    userId: user.id,
    fullName,
    phone,
    email,
    role,
    specialization: body.specialization || null,
    experienceYears: body.experienceYears ?? null,
    locality: body.locality || null,
    hourlyRate: body.hourlyRate ?? null,
    status: "pending"
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
