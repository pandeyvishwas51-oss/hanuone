import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorList from "@/components/DoctorList";
import LocalityChip from "@/components/LocalityChip";
import {
  getAllLocalities,
  getAllSpecializations,
  getSpecializationBySlug,
  searchDoctors
} from "@/lib/queries";
import { titleCase } from "@/lib/utils";

export const revalidate = 3600;

export async function generateStaticParams() {
  const specs = await getAllSpecializations();
  return specs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const spec = await getSpecializationBySlug(params.slug);
  if (!spec) return { title: "Specialty not found" };
  const title = `Best ${spec.name}s in Lucknow — Book Appointment`;
  const description = `Verified ${spec.name.toLowerCase()}s in Lucknow with ratings, fees and contact details. Find the right ${spec.name.toLowerCase()} for your family on Hanuone.`;
  return {
    title,
    description,
    alternates: { canonical: `/specializations/${spec.slug}` },
    openGraph: { title, description }
  };
}

export default async function SpecializationPage({ params }: { params: { slug: string } }) {
  const spec = await getSpecializationBySlug(params.slug);
  if (!spec) notFound();

  const [localities, results] = await Promise.all([
    getAllLocalities(),
    searchDoctors({ specialty: spec.name, sort: "rating", pageSize: 60 })
  ]);

  return (
    <div className="container-page py-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Specialties", href: "/doctors" },
          { label: `${spec.name}s in Lucknow` }
        ]}
      />

      <header className="mt-3">
        <div className="flex items-center gap-2 text-3xl">
          <span aria-hidden>{spec.icon}</span>
          <h1 className="h2">Best {spec.name}s in Lucknow</h1>
        </div>
        {spec.name_hindi && <p className="hi mt-1 text-sm text-muted">{spec.name_hindi}</p>}
        <p className="mt-3 max-w-3xl text-sm text-muted">
          {spec.description ||
            `Looking for a trusted ${spec.name.toLowerCase()} in Lucknow? Hanuone lists verified ${spec.name.toLowerCase()}s across major localities including Gomtinagar, Hazratganj, Aliganj and Indira Nagar. Each profile shows qualifications, experience, consultation fees and a direct WhatsApp link to the clinic. Whether you're searching for a ${spec.name.toLowerCase()} for your parents or for yourself, you can compare ratings, read recent reviews from Lucknow patients, and reach out without any booking fees. New profiles are added every week from Google Places, the National Medical Commission registry, and direct doctor self-registration.`}
        </p>
      </header>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Browse by locality</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {localities.slice(0, 12).map((l) => (
            <a key={l.slug} href={`/${l.slug}/${spec.slug}`} className="chip">
              {spec.name}s in {l.name}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 text-sm text-muted">
          {results.total} {results.total === 1 ? "doctor" : "doctors"} found
        </div>
        <DoctorList
          doctors={results.doctors}
          emptyMessage={`No ${spec.name.toLowerCase()}s listed yet — check back soon.`}
        />
      </section>
    </div>
  );
}
