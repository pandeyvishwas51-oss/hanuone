"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CitySelect from "@/components/CitySelect";

const SLIDES = [
  {
    img: "/hero/consult.jpg",
    pos: "center 30%",
    headline: "Consult verified doctors, online or in-clinic",
    sub: "Connect with a trusted doctor in minutes — video, audio, or at the clinic.",
    cap: "doctor consultation",
  },
  {
    img: "/hero/vitals.jpg",
    pos: "center 25%",
    headline: "Vitals checked at home in minutes",
    sub: "BP, blood sugar, SpO2 and more — recorded and shared with you.",
    cap: "vitals check",
  },
  {
    img: "/hero/injection.jpg",
    pos: "center 50%",
    headline: "Injections, given safely at home",
    sub: "Doctor-prescribed injections by qualified, verified nurses.",
    cap: "injections & nursing",
  },
  {
    img: "/hero/elderly.jpg",
    pos: "center 40%",
    headline: "Compassionate care for your elders",
    sub: "Gentle home nursing and daily support for elderly family members.",
    cap: "elderly care",
  },
  {
    img: "/hero/lab.jpg",
    pos: "center 25%",
    headline: "Lab tests with sample pickup at home",
    sub: "Diagnostics collected from your home, reports delivered online.",
    cap: "lab & diagnostics",
  },
];

const INTERVAL = 3000;

export default function MovingHero() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % SLIDES.length), INTERVAL);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[i];

  return (
    <div className="relative z-30 min-h-[380px] md:min-h-[430px]">
      {/* Background (clipped so the slow zoom doesn't overflow) */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {SLIDES.map((s, k) => (
          <div
            key={k}
            aria-hidden
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              backgroundImage: `url('${s.img}')`,
              backgroundSize: "cover",
              backgroundPosition: s.pos,
              opacity: k === i ? 1 : 0,
              transform: k === i ? "scale(1.06)" : "scale(1)",
              transitionDuration: k === i ? "3000ms, 700ms" : "700ms",
            }}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(0,77,90,0.88)_0%,rgba(0,77,90,0.66)_45%,rgba(13,106,122,0.52)_100%)]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_46px),repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_46px)]" />
      </div>

      {/* Foreground */}
      <div className="mx-auto flex min-h-[380px] max-w-7xl flex-col px-6 py-10 md:min-h-[430px] md:px-12">
        <div className="flex items-center justify-end">
          <span className="hidden items-center gap-2 text-xs text-white/80 sm:inline-flex">▦ {slide.cap}</span>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div key={i} className="hero-anim max-w-xl">
            <h1 className="font-serif text-4xl font-semibold leading-tight text-white md:text-5xl">
              {slide.headline}
            </h1>
            <p className="mt-3 max-w-md text-base text-white/85 md:text-lg">{slide.sub}</p>
          </div>

          <div className="mt-6 flex flex-col items-start gap-2">
            <span className="text-sm text-white/80">Choose your city</span>
            <CitySelect variant="dark" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/home-nursing"
              className="rounded-full bg-brand-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Book home nursing
            </Link>
            <Link
              href="/doctors"
              className="rounded-full border border-white/70 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10"
            >
              Consult a doctor
            </Link>
          </div>
        </div>

        {/* Progress dots + trust chips */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {SLIDES.map((_, k) => (
              <span
                key={k}
                className={`h-1 rounded-full transition-all duration-500 ${k === i ? "w-9 bg-brand-600" : "w-4 bg-white/30"}`}
              />
            ))}
          </div>
          <div className="hidden gap-4 text-xs text-white/85 sm:flex">
            <span>✓ Verified nurses</span>
            <span>✓ 5-min connect</span>
          </div>
        </div>
      </div>
    </div>
  );
}
