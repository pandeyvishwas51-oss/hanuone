/**
 * Push notifications via Firebase Cloud Messaging (FCM).
 *
 * Sending is a no-op until FCM_SERVER_KEY is set, so the rest of the app works
 * without keys. Token capture (registerPushToken) works with just a DB.
 */
import { HAS_DB, db, schema } from "@/lib/db";

const FCM_KEY = process.env.FCM_SERVER_KEY || "";
export const PUSH_LIVE = !!FCM_KEY;

export async function registerPushToken(token: string, userId?: string | null, platform = "web") {
  if (!HAS_DB || !token) return;
  try {
    // Atomic upsert on the unique token — no read-then-write race that could
    // create duplicate rows (and thus duplicate pushes) under concurrent calls.
    await db()
      .insert(schema.pushTokens)
      .values({ token, userId: userId ?? null, platform })
      .onConflictDoUpdate({
        target: schema.pushTokens.token,
        set: { userId: userId ?? null, platform, updatedAt: new Date() }
      });
  } catch {
    /* non-fatal */
  }
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

/** Send a push to one or more tokens. No-op (logs) until FCM_SERVER_KEY is set. */
export async function sendPush(tokens: string[], msg: PushMessage): Promise<{ sent: number }> {
  const list = tokens.filter(Boolean);
  if (!PUSH_LIVE || list.length === 0) {
    return { sent: 0 };
  }
  let sent = 0;
  // FCM legacy HTTP API (simple). Swap to HTTP v1 with a service account later.
  for (const token of list) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: { Authorization: `key=${FCM_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: token,
          notification: { title: msg.title, body: msg.body },
          data: msg.url ? { url: msg.url } : {}
        })
      });
      if (res.ok) sent += 1;
    } catch {
      /* skip failed token */
    }
  }
  return { sent };
}
