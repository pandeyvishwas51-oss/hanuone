import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Edge-safe session verification (mirrors lib/session, without next/headers).
const COOKIE = "ho_session";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-insecure-secret-change-me-please-32b";
  return new TextEncoder().encode(s);
}

type Claims = { sub?: string; role?: string; isAdmin?: boolean };

async function readSession(req: NextRequest): Promise<Claims | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as Claims;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const session = await readSession(req);
  const isLoggedIn = !!session;
  const isAdmin = !!session?.isAdmin || session?.role === "admin";
  const isProvider = session?.role === "provider" || isAdmin;

  if (path.startsWith("/admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(path), req.url));
    if (!isAdmin) return NextResponse.redirect(new URL("/account", req.url));
    return NextResponse.next();
  }

  if (path.startsWith("/pro")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(path), req.url));
    if (!isProvider) return NextResponse.redirect(new URL("/account", req.url));
    return NextResponse.next();
  }

  if ((path.startsWith("/account") || path.startsWith("/consult")) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(path), req.url));
  }

  if (path === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : isProvider ? "/pro" : "/account", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pro/:path*", "/account/:path*", "/consult/:path*", "/login"]
};
