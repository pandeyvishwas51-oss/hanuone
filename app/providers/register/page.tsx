import type { Metadata } from "next";
import { Suspense } from "react";
import ProviderWizard from "./ProviderWizard";

export const metadata: Metadata = {
  title: "Provider registration — HanuONE",
  description: "Register as a verified doctor or nurse on HanuONE. Mobile OTP signup, qualifications, license verification and document upload.",
};

export default function ProviderRegisterPage() {
  return (
    <Suspense>
      <ProviderWizard />
    </Suspense>
  );
}
