import { getLabTests } from "@/lib/lab-catalog";
import LabBooking from "@/components/LabBooking";
import AnswerBlock from "@/components/AnswerBlock";
import ServiceHero from "@/components/ServiceHero";
import HowItWorks from "@/components/HowItWorks";
import { TestTube2, Home, FlaskConical, FileText } from "lucide-react";
import { getActiveCity } from "@/lib/active-city";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Book a Lab Test at Home — verified diagnostics | Hanuone",
  description: "Book blood tests, thyroid, diabetes, lipid and full-body health packages with home sample collection. Digital reports delivered to your Hanuone account."
};

export default async function LabPage() {
  const tests = await getLabTests();
  const city = getActiveCity().name;
  return (
    <div className="container-page py-8">
      <ServiceHero
        emoji="🧪"
        title="Lab tests at home"
        subtitle={`Home sample collection across ${city}. Digital reports delivered to your account.`}
        badges={["Verified labs", "Home collection", "Reports in 24-48h"]}
      />

      <div className="mt-8">
        <HowItWorks
          steps={[
            { Icon: TestTube2, title: "Pick a test" },
            { Icon: Home, title: "Home collection" },
            { Icon: FlaskConical, title: "Verified lab" },
            { Icon: FileText, title: "Digital report" }
          ]}
        />
      </div>

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-medium text-primary">More about home lab tests</summary>
        <div className="mt-3">
          <AnswerBlock
            question="How do I book a home lab test on Hanuone?"
            answer={`Pick a test below, choose home collection, and select a slot. A trained phlebotomist collects your sample at home in ${city}, and your digital report is delivered to your Hanuone account — typically within 24–48 hours. Routine tests start at ₹350.`}
          />
        </div>
      </details>

      <div className="mt-6">
        <LabBooking tests={tests} city={city} />
      </div>
    </div>
  );
}
