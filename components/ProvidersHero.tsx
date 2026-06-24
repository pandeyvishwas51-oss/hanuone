"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const IMAGES = [
  { src: "/providers/01.jpg", pos: "center 35%" },
  { src: "/providers/02.jpg", pos: "center 50%" },
  { src: "/providers/03.jpg", pos: "center 45%" },
];

export default function ProvidersHero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % IMAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative isolate overflow-hidden">
      {/* Dissolving background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {IMAGES.map((img, k) => (
          <div
            key={k}
            aria-hidden
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              backgroundImage: `url('${img.src}')`,
              backgroundSize: "cover",
              backgroundPosition: img.pos,
              opacity: k === i ? 1 : 0,
              transform: k === i ? "scale(1.06)" : "scale(1)",
              transitionDuration: k === i ? "4000ms, 700ms" : "700ms",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(0,77,90,0.9)_0%,rgba(0,77,90,0.72)_50%,rgba(13,106,122,0.55)_100%)]" />
      </div>

      {/* Fixed recruiting content */}
      <div className="mx-auto max-w-6xl px-5 py-16 text-white md:py-24">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/30">
          For doctors &amp; nurses
        </span>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-tight md:text-5xl">
          Grow your practice with HanuONE
        </h1>
        <p className="mt-4 max-w-xl text-white/85">
          Join a trusted network of verified providers. Reach patients online, in clinic, and at home —
          free to join, with verification in 48 hours.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/providers/register?role=doctor" className="rounded-full bg-brand-600 px-7 py-3 font-semibold text-white transition hover:bg-brand-700">
            Register as a Doctor
          </Link>
          <Link href="/providers/register?role=nurse" className="rounded-full border border-white/70 px-7 py-3 font-semibold text-white transition hover:bg-white/10">
            Register as a Nurse
          </Link>
        </div>
      </div>
    </section>
  );
}
