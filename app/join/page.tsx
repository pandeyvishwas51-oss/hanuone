import type { Metadata } from "next";
import WaitlistForm from "@/components/WaitlistForm";
import { getWaitlistCount } from "@/lib/queries";
import { HeartHandshake, Stethoscope, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join Hanuone Home Care Network, Register as Doctor or Nurse",
  description:
    "Are you a doctor, nurse or trained caregiver in Lucknow? Register with Hanuone Home Care to offer home visits, nursing and elder care to families.",
  alternates: { canonical: "/join" }
};

export default async function JoinPage() {
  const count = await getWaitlistCount();
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <span className="hi inline-block rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          Hanuone Home Care Network
        </span>
        <h1 className="h2 mt-3">
          Care for parents at home, earn doing what you do best
        </h1>
        <p className="mt-2 text-muted">
          Hanuone Home Care connects Lucknow families with verified doctors,
          nurses and trained caregivers for home visits and elder care. If you
          provide any of these services, register below, onboarding is free,
          and you set your own availability and rates.
        </p>

        <div className="card mt-6 p-6">
          <div className="text-sm font-semibold text-primary">
            You'll be #{count + 1} in the Home Care Network
          </div>
          <p className="mt-1 text-sm text-muted">
            We'll reach out on WhatsApp to verify your credentials and onboard
            you before our launch in Lucknow.
          </p>
          <div className="mt-5">
            <WaitlistForm />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 text-sm">
          {[
            {
              icon: <Stethoscope size={18} className="text-accent" />,
              t: "Doctors",
              d: "GPs and specialists offering home consultations in Lucknow."
            },
            {
              icon: <HeartHandshake size={18} className="text-accent" />,
              t: "Nurses",
              d: "BSc / GNM / ANM nurses for daytime and overnight care."
            },
            {
              icon: <Users size={18} className="text-accent" />,
              t: "Caregivers & agencies",
              d: "Trained attendants and agencies serving senior citizens."
            }
          ].map((p) => (
            <div key={p.t} className="card p-4">
              <div className="flex items-center gap-2">
                {p.icon}
                <span className="font-semibold text-ink">{p.t}</span>
              </div>
              <div className="mt-1 text-xs text-muted">{p.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
