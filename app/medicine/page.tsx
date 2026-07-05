import MedicineOrder from "@/components/MedicineOrder";
import AnswerBlock from "@/components/AnswerBlock";
import ServiceHero from "@/components/ServiceHero";
import HowItWorks from "@/components/HowItWorks";
import { UploadCloud, BadgeCheck, Wallet, Truck } from "lucide-react";
import { getActiveCity } from "@/lib/active-city";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Order Medicines Online — prescription delivery | Hanuone",
  description: "Upload your prescription and get medicines delivered to your door. Prescription-linked, partner pharmacies, same-day in select pincodes."
};

export default function MedicinePage() {
  const city = getActiveCity().name;
  return (
    <div className="container-page py-8">
      <ServiceHero
        emoji="💊"
        title="Medicines at home"
        subtitle="Upload a prescription or list your medicines. Partner pharmacies confirm the price and deliver to your door."
        badges={["Partner pharmacies", "Prescription-linked", "Same-day in select areas"]}
      />

      <div className="mt-8">
        <HowItWorks
          steps={[
            { Icon: UploadCloud, title: "Upload Rx" },
            { Icon: BadgeCheck, title: "Pharmacy confirms" },
            { Icon: Wallet, title: "Pay securely" },
            { Icon: Truck, title: "Home delivery" }
          ]}
        />
      </div>

      <details className="mt-6 text-sm">
        <summary className="cursor-pointer font-medium text-primary">More about ordering medicines</summary>
        <div className="mt-3">
          <AnswerBlock
            question="How do I order medicines on Hanuone?"
            answer={`Upload a doctor's prescription or list the medicines you need, add your delivery address, and a partner pharmacy in ${city} confirms availability and price. Prescription medicines are dispensed only against a valid prescription, and delivery is same-day in select pincodes.`}
          />
        </div>
      </details>

      <div className="mt-6">
        <MedicineOrder city={city} />
      </div>
    </div>
  );
}
