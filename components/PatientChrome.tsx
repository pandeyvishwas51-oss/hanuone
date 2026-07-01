"use client";

import { usePathname } from "next/navigation";

/**
 * Renders the patient-site chrome (header, footer, mobile nav, chat + voice
 * bubbles) around page content — EXCEPT on the standalone provider/ops portals
 * (/clinic, /care, /console), which bring their own dedicated layouts. The
 * header/footer are passed in as already-rendered server nodes.
 */
const BARE = /^\/(clinic|care|console|admin)(\/|$)/;

export default function PatientChrome({
  header, footer, children
}: { header: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  if (BARE.test(pathname)) return <>{children}</>;
  return (
    <>
      {header}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {footer}
    </>
  );
}
