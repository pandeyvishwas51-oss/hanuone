import type { Metadata } from "next";
import { Suspense } from "react";
import { CITY } from "@/lib/data";
import NursingBooking from "./NursingBooking";

export const metadata: Metadata = {
  title: `Home Nursing Visit in ${CITY.name} — Book a Verified Nurse | HanuONE`,
  description: `Book verified home nursing in ${CITY.name}: vitals check, wound dressing, injections, elderly care and nursing-assisted doctor consultation. Trusted, qualified nurses at home.`,
  alternates: { canonical: "/home-nursing" },
};

export default function HomeNursingPage() {
  return (
    <Suspense>
      <NursingBooking />
    </Suspense>
  );
}
