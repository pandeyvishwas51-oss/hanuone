// Supabase Storage helpers for private health documents (prescriptions, reports).
import { supabaseService } from "./supabase";

const HAS_STORAGE = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Upload a buffer to a private bucket and return a long-lived signed URL.
 * Returns null in dev (no storage configured) so callers degrade gracefully.
 */
export async function uploadPrivate(
  bucket: string,
  path: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  if (!HAS_STORAGE) return null;
  try {
    const svc = supabaseService();
    // Best-effort bucket create (ignore "already exists").
    await svc.storage.createBucket(bucket, { public: false }).catch(() => undefined);
    const { error } = await svc.storage.from(bucket).upload(path, body, { contentType, upsert: true });
    if (error) throw error;
    const { data } = await svc.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  } catch (e) {
    console.error("[storage.uploadPrivate]", e);
    return null;
  }
}

/** Upload a base64 data URL (canvas signature / captured photo). Returns a signed URL. */
export async function uploadDataUrl(bucket: string, path: string, dataUrl: string): Promise<string | null> {
  const match = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!match) return null;
  return uploadPrivate(bucket, path, Buffer.from(match[2], "base64"), match[1]);
}
