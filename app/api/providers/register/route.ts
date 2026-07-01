import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { sendEmail } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["doctor", "nurse", "physiotherapist", "caregiver", "ward_boy", "agency"];

// POST -> create or update the logged-in user's professional profile (status: pending).
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Login required to apply" }, { status });
  }
  // Throttle: each call emails ops; cap to stop email-bombing.
  const rl = await rateLimit(`provreg:${clientIp(req)}`, 5, 60);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests. Please wait a moment." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = String(b.fullName ?? b.name ?? "").trim().slice(0, 120);
  const phone = String(b.phone ?? "").trim().slice(0, 20);
  const role = String(b.role ?? "").trim();
  if (!fullName || !phone) return NextResponse.json({ ok: false, error: "Name and phone are required" }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ ok: false, error: "Choose a valid role" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  // Validate/clamp public-facing supply data so a client can't store negative
  // experience, a 1MB bio, or an unbounded services/languages array.
  const str = (v: unknown, n: number) => (v ? String(v).slice(0, n) : null);
  const strArr = (v: unknown) => (Array.isArray(v) ? v.slice(0, 20).map((x) => String(x).slice(0, 60)) : null);
  const expYears = b.experienceYears != null && Number.isFinite(Number(b.experienceYears))
    ? Math.max(0, Math.min(70, Math.floor(Number(b.experienceYears))))
    : null;

  const values = {
    userId: user.id,
    fullName,
    phone,
    email: str(b.email, 160),
    gender: str(b.gender, 20),
    role,
    specialization: str(b.specialization, 120),
    experienceYears: expYears,
    bio: str(b.bio, 1000),
    locality: str(b.locality, 120),
    city: str(b.city, 80) || "Lucknow",
    pincode: str(b.pincode, 10),
    services: strArr(b.services),
    languages: strArr(b.languages),
    status: "pending" as const
  };

  const [existing] = await db().select({ id: schema.professionals.id }).from(schema.professionals).where(eq(schema.professionals.userId, user.id)).limit(1);
  let id: string;
  if (existing) {
    await db().update(schema.professionals).set({ ...values, updatedAt: new Date() }).where(eq(schema.professionals.id, existing.id));
    id = existing.id;
  } else {
    const [row] = await db().insert(schema.professionals).values(values).returning({ id: schema.professionals.id });
    id = row.id;
  }

  await sendEmail([process.env.NOTIFY_EMAIL || "ops@hanuone.com"], `New provider application: ${fullName} (${role})`,
    `<div style="font-family:system-ui"><h2>New provider application</h2><p>${fullName} · ${role} · ${phone}</p><p>Review in the admin panel to verify.</p></div>`).catch(() => {});
  await audit({ actorUserId: user.id, actorRole: user.role, action: existing ? "update" : "create", entity: "professionals", entityId: id, meta: { role }, ipAddress: clientIp(req) });
  // Supply-side conversion event (only count brand-new registrations, not edits).
  if (!existing) await track({ name: "provider_registered", userId: user.id, city: values.city ?? null, props: { role } });

  return NextResponse.json({ ok: true, id, status: "pending" });
}
