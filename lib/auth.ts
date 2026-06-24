// Server-side auth helpers for RSC and route handlers.
import { eq } from "drizzle-orm";
import { HAS_DB, db, schema } from "./db";
import { getSession, createSession, type SessionUser } from "./session";

export { getSession, createSession };
export type { SessionUser };

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSession();
}

/** Throws if not logged in. Use in route handlers; catch to return 401. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
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
    // Promote role to provider if registering as one; never downgrade.
    if (opts.role === "provider" && existing.role === "patient") {
      await db().update(schema.users).set({ role: "provider" }).where(eq(schema.users.id, existing.id));
    }
    return {
      id: existing.id,
      phone: existing.phone,
      name: opts.name ?? existing.name,
      role: (opts.role === "provider" && existing.role === "patient" ? "provider" : existing.role) as SessionUser["role"],
      isAdmin: !!existing.isAdmin
    };
  }
  const [created] = await db()
    .insert(schema.users)
    .values({ phone, name: opts.name ?? null, role: opts.role ?? "patient", phoneVerified: new Date() })
    .returning();
  return { id: created.id, phone: created.phone, name: created.name, role: created.role as SessionUser["role"], isAdmin: false };
}
