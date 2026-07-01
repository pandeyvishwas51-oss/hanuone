import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";
import { audit, clientIp } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCT = /^\d{6,18}$/;

function mask(n?: string | null) { return n ? `••••••${n.slice(-4)}` : null; }

// GET -> the provider's payout details (account number masked).
export async function GET() {
  const prof = await getCurrentProfessional();
  if (!prof) return NextResponse.json({ ok: false, error: "Provider only" }, { status: 403 });
  return NextResponse.json({
    ok: true,
    bank: {
      accountName: prof.bankAccountName ?? "",
      accountNumberMasked: mask(prof.bankAccountNumber),
      hasAccount: !!prof.bankAccountNumber,
      ifsc: prof.bankIfsc ?? "",
      upiId: prof.upiId ?? "",
      verified: !!prof.payoutVerified
    }
  });
}

// POST { accountName, accountNumber, ifsc, upiId } -> save payout details.
export async function POST(req: Request) {
  if (!HAS_DB) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  const prof = await getCurrentProfessional();
  if (!prof) return NextResponse.json({ ok: false, error: "Provider only" }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { accountName?: string; accountNumber?: string; ifsc?: string; upiId?: string };
  const accountName = (b.accountName || "").trim().slice(0, 120);
  const accountNumber = (b.accountNumber || "").replace(/\s/g, "");
  const ifsc = (b.ifsc || "").trim().toUpperCase();
  const upiId = (b.upiId || "").trim().slice(0, 80);

  // Allow EITHER a full bank account OR a UPI id.
  const wantsBank = accountNumber || ifsc || accountName;
  if (wantsBank) {
    if (!accountName) return NextResponse.json({ ok: false, error: "Account holder name is required" }, { status: 400 });
    if (!ACCT.test(accountNumber)) return NextResponse.json({ ok: false, error: "Enter a valid bank account number" }, { status: 400 });
    if (!IFSC.test(ifsc)) return NextResponse.json({ ok: false, error: "Enter a valid IFSC code (e.g. HDFC0001234)" }, { status: 400 });
  }
  if (!wantsBank && !upiId) return NextResponse.json({ ok: false, error: "Add a bank account or a UPI ID" }, { status: 400 });
  if (upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) return NextResponse.json({ ok: false, error: "Enter a valid UPI ID (e.g. name@upi)" }, { status: 400 });

  await db().update(schema.professionals).set({
    bankAccountName: wantsBank ? accountName : prof.bankAccountName,
    bankAccountNumber: wantsBank ? accountNumber : prof.bankAccountNumber,
    bankIfsc: wantsBank ? ifsc : prof.bankIfsc,
    upiId: upiId || prof.upiId,
    payoutVerified: false, // re-verify whenever details change
    updatedAt: new Date()
  }).where(eq(schema.professionals.id, prof.id));

  await audit({ actorUserId: prof.userId, actorRole: "provider", action: "update", entity: "professionals", entityId: prof.id, meta: { payoutDetails: true }, ipAddress: clientIp(req) });
  return NextResponse.json({ ok: true });
}
