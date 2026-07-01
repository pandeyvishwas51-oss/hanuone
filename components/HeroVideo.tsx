"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero background — full-bleed video, no bars. object-cover fills the whole
 * hero (a vertical video gets cropped to fill; that is the only way to avoid
 * side bars). A light scrim keeps the headline readable.
 *
 * Performance: a tiny poster (~40KB) paints instantly so the hero box has no
 * CLS and never blocks the H1 (the LCP element). The 6MB video is NOT preloaded
 * — we only attach its src after first paint (and skip it when the user has
 * Save-Data / reduced-motion on), so it can never contend with LCP bandwidth.
 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    const saveData = nav.connection?.saveData;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (saveData || reduce) return; // keep the static poster only
    // Defer to idle so the video download starts after the LCP paint.
    const start = () => setSrc("/hero/hero-clean.mp4");
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = ric ? ric(start) : window.setTimeout(start, 1200);
    return () => {
      if (ric) (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(id);
      else window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (src && ref.current) ref.current.load();
  }, [src]);

  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden bg-black">
      <video
        ref={ref}
        src={src}
        poster="/hero/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* Light scrim only for headline legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-transparent to-bg/70" />
    </div>
  );
}
