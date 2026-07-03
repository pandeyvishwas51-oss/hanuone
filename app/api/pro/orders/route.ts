import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["placed", "confirmed", "dispatched", "delivered", "cancelled"];
const LAB_VALID = ["booked", "sample_collected", "report_ready", "completed", "cancelled"];

// POST { id, type?, status?, reportUrl?, deliveryPersonName?, deliveryPersonPhone? }
export async function POST(req: Request) {
  // Medicine + lab fulfilment is an ops function — restrict to admins (no partner
  // ownership model yet, so any-provider access would be an IDOR hole).
  const user = await getCurrentUser();
  if (!user || (!user.isAdmin && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    type?: "medicine" | "lab";
    status?: string;
    reportUrl?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
  };
  if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  // Lab orders: advance the lab lifecycle (and optionally attach a report link).
  if (body.type === "lab") {
    if (!body.status || !LAB_VALID.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "valid lab status required" }, { status: 400 });
    }
    await db()
      .update(schema.labOrders)
      .set({ status: body.status, ...(body.reportUrl ? { reportUrl: body.reportUrl } : {}), updatedAt: new Date() })
      .where(eq(schema.labOrders.id, body.id));
    await audit({ actorUserId: user.id, actorRole: user.role, action: "update", entity: "lab_orders", entityId: body.id, meta: { status: body.status }, ipAddress: clientIp(req) });
    return NextResponse.json({ ok: true });
  }

  if (body.status && VALID.includes(body.status)) {
    await db()
      .update(schema.medicineOrders)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(schema.medicineOrders.id, body.id));
  }

  // Record / update the delivery person on the order.
  if (body.deliveryPersonName || body.deliveryPersonPhone) {
    try {
      await db().insert(schema.deliveryAssignments).values({
        medicineOrderId: body.id,
        deliveryPersonName: body.deliveryPersonName ?? null,
        deliveryPersonPhone: body.deliveryPersonPhone ?? null,
        status: body.status === "dispatched" ? "out_for_delivery" : "accepted"
      });
    } catch {
      /* assignment is best-effort */
    }
  }

  await audit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "update",
    entity: "medicine_orders",
    entityId: body.id,
    meta: { status: body.status },
    ipAddress: clientIp(req)
  });
  return NextResponse.json({ ok: true });
}
