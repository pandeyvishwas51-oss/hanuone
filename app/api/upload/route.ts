import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { requireUser } from "@/lib/auth";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HAS_STORAGE = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX = 8 * 1024 * 1024; // 8MB

// POST multipart/form-data { file } -> { url }. Used for prescription uploads.
export async function POST(req: Request) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ ok: false, error: "File too large (max 8MB)" }, { status: 400 });
  }
  if (!HAS_STORAGE) {
    // Dev: accept but report no persistent URL.
    return NextResponse.json({ ok: true, url: null, dev: true });
  }
  try {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${new Date().toISOString().slice(0, 10)}/${nanoid(12)}.${ext}`;
    const svc = supabaseService();
    await svc.storage.createBucket("uploads", { public: true }).catch(() => undefined);
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await svc.storage.from("uploads").upload(path, buf, { contentType: file.type || "application/octet-stream", upsert: true });
    if (error) throw error;
    const { data } = svc.storage.from("uploads").getPublicUrl(path);
    return NextResponse.json({ ok: true, url: data.publicUrl });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
