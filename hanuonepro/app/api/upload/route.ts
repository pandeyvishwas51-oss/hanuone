import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const form = await req.formData();
  const kind = String(form.get("kind") || ""); // 'aadhaar' | 'certificate' | 'profile_photo'
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "File too large (max 5MB)" }, { status: 400 });
  if (!ACCEPT.includes(file.type)) return NextResponse.json({ ok: false, error: "Only JPG/PNG/WEBP/PDF" }, { status: 400 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { ok: false, error: "Vercel Blob not configured. Add BLOB_READ_WRITE_TOKEN env var." },
      { status: 500 }
    );
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${kind}-${Date.now()}-${safeName}`;

  const blob = await put(path, file, { access: "public", contentType: file.type });

  // Update the professional row
  const [prof] = await db().select().from(schema.professionals).where(eq(schema.professionals.userId, userId)).limit(1);
  if (prof) {
    if (kind === "aadhaar") {
      await db().update(schema.professionals).set({ aadhaarUrl: blob.url }).where(eq(schema.professionals.id, prof.id));
    } else if (kind === "certificate") {
      const next = [...(prof.certificateUrls ?? []), blob.url];
      await db().update(schema.professionals).set({ certificateUrls: next }).where(eq(schema.professionals.id, prof.id));
    } else if (kind === "profile_photo") {
      await db().update(schema.professionals).set({ profilePhotoUrl: blob.url }).where(eq(schema.professionals.id, prof.id));
    }
  }

  return NextResponse.json({ ok: true, url: blob.url });
}
