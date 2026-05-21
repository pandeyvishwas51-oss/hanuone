import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id, status, rejectionReason } = await req.json().catch(() => ({}));
  if (!id || !status) return NextResponse.json({ ok: false, error: "id and status required" }, { status: 400 });
  if (!["pending", "verified", "rejected", "suspended"].includes(status)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }
  await db()
    .update(schema.professionals)
    .set({ status, rejectionReason: rejectionReason ?? null })
    .where(eq(schema.professionals.id, id));
  return NextResponse.json({ ok: true });
}
