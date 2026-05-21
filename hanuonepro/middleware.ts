import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const session = req.auth;
  const isLoggedIn = !!session;
  const isAdmin = !!session?.user?.isAdmin;

  if (path.startsWith("/admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login?next=/admin", req.url));
    if (!isAdmin) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (path.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((path === "/login" || path === "/register") && isLoggedIn) {
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/dashboard", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"]
};
