// Stateless signed-cookie session (replaces NextAuth).
// HS256 JWT in an httpOnly cookie, verifiable in both Node and Edge runtimes.
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "ho_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  phone: string | null;
  name: string | null;
  role: "patient" | "provider" | "admin";
  isAdmin: boolean;
};

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) {
    // Dev-only fallback so the flow is testable before the secret is set.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production");
    }
    return new TextEncoder().encode("dev-insecure-secret-change-me-please-32b");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ phone: user.phone, name: user.name, role: user.role, isAdmin: user.isAdmin })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      phone: (payload.phone as string) ?? null,
      name: (payload.name as string) ?? null,
      role: (payload.role as SessionUser["role"]) ?? "patient",
      isAdmin: !!payload.isAdmin
    };
  } catch {
    return null;
  }
}

/** Set the session cookie (call from a route handler / server action). */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE
  });
}

/** Read + verify the current session from the request cookies. */
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function destroySession(): Promise<void> {
  cookies().delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
