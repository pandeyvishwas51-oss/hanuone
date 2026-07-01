import { NextResponse } from "next/server";
import { extractLicense, type DocType } from "@/lib/verify-license";
import { requireAdmin, AuthError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED: DocType[] = ["medical_registration", "nursing_registration", "degree", "gov_id", "drug_license"];
const MAX_B64 = 7_000_000;

// POST { docType, mediaType, data(base64) } -> OCR-extracted license fields + registry URL
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 401;
    return NextResponse.json({ ok: false, error: "Admin only" }, { status });
  }

  let body: { docType?: string; mediaType?: string; data?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const docType = (body.docType as DocType) || "medical_registration";
  if (!ALLOWED.includes(docType)) return NextResponse.json({ ok: false, error: "Bad docType" }, { status: 400 });
  if (typeof body.data !== "string" || typeof body.mediaType !== "string") {
    return NextResponse.json({ ok: false, error: "data and mediaType required" }, { status: 400 });
  }
  if (body.data.length > MAX_B64) return NextResponse.json({ ok: false, error: "File too large" }, { status: 413 });

  try {
    const result = await extractLicense(
      { kind: body.mediaType === "application/pdf" ? "pdf" : "image", mediaType: body.mediaType, data: body.data },
      docType
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "OCR error" }, { status: 500 });
  }
}
