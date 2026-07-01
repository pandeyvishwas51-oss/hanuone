import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["placed", "confirmed", "dispatched", "delivered", "cancelled"];

// POST { id, status?, deliveryPersonName?, deliveryPersonPhone? }
export async function POST(req: Request) {
  // Medicine fulfilment is an ops function — restrict to admins (no pharmacy
  // partner ownership model yet, so any-provider access was an IDOR hole).
  const user = await getCurrentUser();
  if (!user || (!user.isAdmin && user.role !== "admin")) {
    return NextResponse.json({ ok: false, error: "Admin only" }, { status: 403 });
  }
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
  };
  if (!body.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

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
