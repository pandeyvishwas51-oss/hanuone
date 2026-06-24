// Append-only audit logging for writes to health/payment tables (DPDP + NMC).
// Best-effort: never throws, never blocks the main operation.
import { HAS_DB, db, schema } from "./db";

export type AuditEntry = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: "create" | "update" | "read" | "delete" | "consent" | "payment" | "refund" | "login";
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ipAddress?: string | null;
};

export async function audit(entry: AuditEntry): Promise<void> {
  if (!HAS_DB) return;
  try {
    await db().insert(schema.auditLogs).values({
      actorUserId: entry.actorUserId ?? null,
      actorRole: entry.actorRole ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      meta: entry.meta ? JSON.stringify(entry.meta) : null,
      ipAddress: entry.ipAddress ?? null
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

/** Extract a best-effort client IP from a request. */
export function clientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null
  );
}
