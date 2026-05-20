"use client";

import { useEffect, useState } from "react";
import { resolveCityCopy } from "@/lib/cities";

type Props = {
  /** The city detected on the server (Vercel geo header) before hydration. */
  initialCity: string;
};

/**
 * Hero headline that adapts to the viewer's city.
 *
 * Priority order:
 *  1. localStorage `hanuone:city` (set by visiting that city's locality page)
 *  2. server-detected city via Vercel geo headers
 *  3. fallback to "Lucknow"
 */
export default function HeroHeadline({ initialCity }: Props) {
  const [copy, setCopy] = useState(() => resolveCityCopy(initialCity));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("hanuone:city");
    if (saved && saved !== copy.city) {
      setCopy(resolveCityCopy(saved));
    }
  }, [copy.city]);

  return (
    <h1 className="h1 mt-3 sm:mt-4">
      {copy.possessive} Trusted Doctors,{" "}
      <span className="text-primary">Ek Jagah</span>
    </h1>
  );
}
