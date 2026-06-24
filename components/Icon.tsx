import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  stethoscope: (
    <>
      <path d="M5 3v5a4 4 0 0 0 8 0V3" />
      <path d="M9 12v3a5 5 0 0 0 5 5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
    </>
  ),
  vitals: <path d="M3 12h4l2 5 3-10 2 5h7" />,
  syringe: (
    <>
      <path d="M16 4l4 4" />
      <path d="M14 6l-9 9-1.5 4.5 4.5-1.5 9-9z" />
      <path d="M13 7l4 4" />
      <path d="M4 20l1.5-1.5" />
    </>
  ),
  bandage: (
    <>
      <path d="M14.5 4.5l5 5a3 3 0 0 1 0 4l-5 5a3 3 0 0 1-4 0l-5-5a3 3 0 0 1 0-4l5-5a3 3 0 0 1 4 0z" />
      <circle cx="10" cy="12" r="0.6" />
      <circle cx="12" cy="10" r="0.6" />
      <circle cx="12" cy="14" r="0.6" />
      <circle cx="14" cy="12" r="0.6" />
    </>
  ),
  elderly: (
    <>
      <circle cx="10" cy="4" r="2" />
      <path d="M10 6v7" />
      <path d="M10 9l-3 1.5" />
      <path d="M10 9l4 1.5" />
      <path d="M10 13l-2 7" />
      <path d="M10 13l2 7" />
      <path d="M15 8v12" />
    </>
  ),
  nurseHeart: (
    <>
      <circle cx="8" cy="7" r="3.5" />
      <path d="M3 21v-1.5a4.5 4.5 0 0 1 4.5-4.5H10" />
      <path d="M17.5 21l3-3a1.8 1.8 0 0 0-2.6-2.5l-.4.4-.4-.4a1.8 1.8 0 0 0-2.6 2.5z" />
    </>
  ),
  droplet: <path d="M12 3c3.5 4 5.5 6.8 5.5 9.5a5.5 5.5 0 0 1-11 0C6.5 9.8 8.5 7 12 3z" />,
  hospital: (
    <>
      <path d="M4 21h16" />
      <path d="M6 21V8l6-4 6 4v13" />
      <path d="M12 9v4" />
      <path d="M10 11h4" />
    </>
  ),
};

export default function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
