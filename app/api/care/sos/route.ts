import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";
import { sendEmail } from "@/lib/notify";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPS = process.env.NOTIFY_EMAIL?.trim() || "ops@hanuone.com";

// POST { lat?, lng?, visitId? } -> a field provider raises an SOS. Alerts ops
// with their live location for immediate safety response.
export async function POST(req: Request) {
  const prof = await getCurrentProfessional();
  if (!prof) return NextResponse.json({ ok: false, error: "Provider only" }, { status: 403 });
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as { lat?: number; lng?: number; visitId?: string };
  const mapsLink = typeof b.lat === "number" && typeof b.lng === "number" ? `https://maps.google.com/?q=${b.lat},${b.lng}` : null;

  let visitInfo = "";
  if (b.visitId) {
    const [v] = await db().select({ name: schema.serviceVisits.patientName, addr: schema.serviceVisits.address }).from(schema.serviceVisits).where(eq(schema.serviceVisits.id, b.visitId)).limit(1);
    if (v) visitInfo = `<p>During visit to <b>${v.name}</b> — ${v.addr}</p>`;
  }

  await sendEmail([OPS], `🚨 SOS from ${prof.fullName} (${prof.role})`,
    `<div style="font-family:system-ui;max-width:560px"><h2 style="color:#b91c1c">🚨 Provider SOS</h2>
     <p><b>${prof.fullName}</b> · ${prof.role} · <a href="tel:${prof.phone}">${prof.phone}</a></p>
     ${visitInfo}${mapsLink ? `<p>Live location: <a href="${mapsLink}">${mapsLink}</a></p>` : "<p>Location unavailable.</p>"}
     <p style="color:#b91c1c;font-weight:600">Call them immediately.</p></div>`).catch(() => {});

  await audit({ actorUserId: prof.userId, actorRole: "provider", action: "create", entity: "sos", entityId: b.visitId ?? prof.id, meta: { lat: b.lat, lng: b.lng }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
