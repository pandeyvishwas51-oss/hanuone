"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const VISITOR_KEY = "hanuone:visitor_id";
// Analytics endpoint on this app (same DB). Override with NEXT_PUBLIC_TRACK_URL if needed.
const TRACK_URL = process.env.NEXT_PUBLIC_TRACK_URL || "/api/track";

function ensureVisitorId(): { id: string; isFirst: boolean } {
  if (typeof window === "undefined") return { id: "ssr", isFirst: false };
  const existing = window.localStorage.getItem(VISITOR_KEY);
  if (existing) return { id: existing, isFirst: false };
  const next = (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(VISITOR_KEY, next);
  return { id: next, isFirst: true };
}

export default function Tracker({ site }: { site: string }) {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;
    const { id, isFirst } = ensureVisitorId();
    const payload = JSON.stringify({
      site,
      path: pathname,
      referrer: document.referrer || null,
      visitorId: id,
      isFirstVisit: isFirst
    });
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon) navigator.sendBeacon(TRACK_URL, blob);
      else fetch(TRACK_URL, { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    } catch {
      /* swallow analytics errors */
    }
  }, [pathname, site]);

  return null;
}
