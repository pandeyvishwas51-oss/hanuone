import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  if (!HAS_DB) return NextResponse.json({ ok: true, professionals: [] });
  const rows = await db().select().from(schema.professionals).orderBy(desc(schema.professionals.createdAt)).limit(100);
  return NextResponse.json({ ok: true, professionals: rows });
}

// POST { id, action: 'verify' | 'reject' | 'suspend', reason? }
export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }
  const body = (await req.json().catch(() => ({}))) as { id?: string; action?: string; reason?: string };
  const map: Record<string, string> = { verify: "verified", reject: "rejected", suspend: "suspended" };
  const status = body.action ? map[body.action] : undefined;
  if (!body.id || !status) return NextResponse.json({ ok: false, error: "id and valid action required" }, { status: 400 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  // Read the linked user first so the professional-status flip and the user-role
  // change run atomically (neon-http db.batch = one tx). Otherwise a failure
  // between them leaves a "verified" pro whose user is still a patient (locked out).
  const [profRow] = await db().select().from(schema.professionals).where(eq(schema.professionals.id, body.id)).limit(1);
  if (!profRow) return NextResponse.json({ ok: false, error: "Professional not found" }, { status: 404 });

  // verify → provider, suspend/reject → patient.
  const newRole = status === "verified" ? "provider" : status === "suspended" || status === "rejected" ? "patient" : null;
  const setStatus = db().update(schema.professionals).set({ status, rejectionReason: body.reason ?? null, updatedAt: new Date() }).where(eq(schema.professionals.id, body.id));
  if (profRow.userId && newRole) {
    await db().batch([
      setStatus,
      db().update(schema.users).set({ role: newRole }).where(eq(schema.users.id, profRow.userId))
    ]);
  } else {
    await setStatus;
  }

  // A verified DOCTOR needs a linked `doctors` catalog row — that row is what
  // makes them appear in /doctors AND what the whole teleconsult surface
  // resolves through (consultations, availability, slots, payouts all key off
  // doctors.userId). Without it a self-registered doctor had an empty clinic
  // portal and never showed in the catalog, despite the revalidate below.
  if (status === "verified" && profRow.role === "doctor" && profRow.userId) {
    try {
      const [existingDoc] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.userId, profRow.userId)).limit(1);
      if (!existingDoc) {
        const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const city = profRow.city || "Lucknow";
        const locality = profRow.locality || city;
        const spec = profRow.specialization || "General Physician";
        const base = slugify(`dr-${profRow.fullName}-${spec}-${locality}`) || `dr-${profRow.userId.slice(0, 8)}`;
        // Keep the slug unique (fall back to a user-id suffix on collision).
        const [clash] = await db().select({ id: schema.doctors.id }).from(schema.doctors).where(eq(schema.doctors.slug, base)).limit(1);
        const slug = clash ? `${base}-${profRow.userId.slice(0, 6)}` : base;
        await db().insert(schema.doctors).values({
          userId: profRow.userId,
          name: profRow.fullName,
          slug,
          specialization: spec,
          experienceYears: profRow.experienceYears,
          clinicAddress: locality === city ? city : `${locality}, ${city}`,
          locality,
          city,
          pincode: profRow.pincode,
          phone: profRow.phone,
          languages: profRow.languages ?? undefined,
          verified: true,
          source: "onboarded",
          isActive: true
        }).onConflictDoNothing();
      }
    } catch (e) {
      // Catalog row is additive; a failure here must not undo verification.
      console.error("[admin/professionals] doctor catalog link", e);
    }
  }

  await audit({ actorUserId: admin.id, actorRole: "admin", action: "update", entity: "professionals", entityId: body.id, meta: { status }, ipAddress: clientIp(req) });
  // Bust cached provider/doctor listings so a newly-verified provider appears now.
  revalidateTag("doctors");
  revalidatePath("/doctors");
  return NextResponse.json({ ok: true });
}
