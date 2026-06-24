"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Shows "Log in" or "My account" depending on session.
export default function AccountNavLink() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((j) => setLoggedIn(!!j.user)).catch(() => setLoggedIn(false));
  }, []);
  if (loggedIn === null) return null;
  return (
    <Link href={loggedIn ? "/account" : "/login"} className="hover:text-accent">
      {loggedIn ? "My account" : "Log in"}
    </Link>
  );
}
