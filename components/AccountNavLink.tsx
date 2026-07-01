"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Shows "Log in" or "My account" depending on session.
export default function AccountNavLink() {
  // Default to "Log in" so the nav never shifts/flashes; update once we know.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => { if (!ignore) setLoggedIn(!!j.user); })
      .catch(() => { if (!ignore) setLoggedIn(false); });
    return () => { ignore = true; };
  }, []);
  return (
    <Link href={loggedIn ? "/account" : "/login"} className="whitespace-nowrap hover:text-accent">
      {loggedIn ? "My account" : "Log in"}
    </Link>
  );
}
