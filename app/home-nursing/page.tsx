import type { Metadata } from "next";
import { Suspense } from "react";
import { CITY } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import NursingBooking from "./NursingBooking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Home Nursing Visit in ${CITY.name} — Book a Verified Nurse | HanuONE`,
  description: `Book verified home nursing in ${CITY.name}: vitals check, wound dressing, injections, elderly care and nursing-assisted doctor consultation. Trusted, qualified nurses at home.`,
  alternates: { canonical: "/home-nursing" },
};

export default async function HomeNursingPage() {
  // Reuse the signed-in patient's saved profile so the booking never re-asks
  // for name/phone (and the persisted visit links to their account).
  const user = await getCurrentUser().catch(() => null);
  return (
    <Suspense>
      <NursingBooking defaultName={user?.name ?? ""} defaultPhone={user?.phone?.replace(/^91/, "") ?? ""} />
    </Suspense>
  );
}
