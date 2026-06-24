import { notFound } from "next/navigation";
import { getDoctorBySlug } from "@/lib/queries";
import ConsultBooking from "@/components/ConsultBooking";
import BreadcrumbNav from "@/components/BreadcrumbNav";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const doctor = await getDoctorBySlug(params.slug);
  return { title: doctor ? `Book ${doctor.name}` : "Book a consultation", robots: { index: false } };
}

export default async function BookPage({ params }: { params: { slug: string } }) {
  const doctor = await getDoctorBySlug(params.slug);
  if (!doctor) notFound();

  return (
    <div className="container-page py-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: doctor.name, href: `/doctors/${doctor.slug}` },
          { label: "Book" }
        ]}
      />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr,380px]">
        <div className="card p-6">
          <h1 className="h2">{doctor.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {doctor.specialization} · {doctor.locality}, {doctor.city}
          </p>
          {doctor.experience_years ? <p className="mt-2 text-sm text-ink">{doctor.experience_years} years of experience</p> : null}
          <ul className="mt-4 space-y-1 text-sm text-muted">
            <li>• NMC-compliant teleconsultation with explicit consent</li>
            <li>• Secure video room (no app install needed)</li>
            <li>• e-Prescription delivered to your account & WhatsApp</li>
          </ul>
        </div>
        <ConsultBooking
          doctorSlug={doctor.slug}
          doctorName={doctor.name}
          defaultFee={doctor.consultation_fee_min ?? 400}
        />
      </div>
    </div>
  );
}
