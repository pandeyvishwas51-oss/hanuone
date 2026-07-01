// Server-side auth helpers for RSC and route handlers.
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "./db";
import { getSession, createSession, destroySession, type SessionUser } from "./session";

export { getSession, createSession };
export type { SessionUser };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const user = await getSession();
  if (!user) return null;
  // Guard against legacy/dev sessions (id "dev-<phone>") created before a real
  // database was connected. With a DB, user ids must be UUIDs, so a non-UUID id
  // would crash queries. Treat it as logged-out and clear the stale cookie.
  if (HAS_DB && !UUID_RE.test(user.id)) {
    try {
      await destroySession();
    } catch {
      /* ignore */
    }
    return null;
  }
  return user;
}

/** Throws if not logged in. Use in route handlers; catch to return 401. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Login required");
  return user;
}

export async function requireRole(role: SessionUser["role"]): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role && !user.isAdmin) throw new AuthError(403, `Requires ${role} role`);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin && user.role !== "admin") throw new AuthError(403, "Admin only");
  return user;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Find an existing user by phone or create one. Used after OTP verification.
 * Returns a SessionUser shape ready to sign into a cookie.
 */
export async function upsertUserByPhone(
  phone: string,
  opts: { name?: string | null; role?: SessionUser["role"] } = {}
): Promise<SessionUser> {
  if (!HAS_DB) {
    // Dev fallback: synthesize a user so the flow works without a database.
    return { id: `dev-${phone}`, phone, name: opts.name ?? null, role: opts.role ?? "patient", isAdmin: false };
  }
  const [existing] = await db().select().from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
  if (existing) {
    // SECURITY: never escalate role from a client-supplied value at login. The
    // `provider` role is granted ONLY by an admin verifying the professional.
    return {
      id: existing.id,
      phone: existing.phone,
      name: opts.name ?? existing.name,
      role: existing.role as SessionUser["role"],
      isAdmin: !!existing.isAdmin
    };
  }
  // New accounts are always patients. Provider access comes from admin approval.
  const [created] = await db()
    .insert(schema.users)
    .values({ phone, name: opts.name ?? null, role: "patient", phoneVerified: new Date() })
    .returning();
  return { id: created.id, phone: created.phone, name: created.name, role: created.role as SessionUser["role"], isAdmin: false };
}
