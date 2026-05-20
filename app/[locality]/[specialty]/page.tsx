import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorList from "@/components/DoctorList";
import {
  getCombinationsForStaticParams,
  getLocalityBySlug,
  getSpecializationBySlug,
  searchDoctors
} from "@/lib/queries";

export const revalidate = 3600;

type Params = { locality: string; specialty: string };

export async function generateStaticParams() {
  return getCombinationsForStaticParams();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [loc, spec] = await Promise.all([
    getLocalityBySlug(params.locality),
    getSpecializationBySlug(params.specialty)
  ]);
  if (!loc || !spec) return { title: "Page not found" };
  const title = `Best ${spec.name} in ${loc.name}, Lucknow`;
  const description = `Top ${spec.name.toLowerCase()}s in ${loc.name}, Lucknow. View ratings, fees, qualifications and contact via WhatsApp directly on Hanuone.`;
  return {
    title,
    description,
    alternates: { canonical: `/${loc.slug}/${spec.slug}` },
    openGraph: { title, description }
  };
}

export default async function ComboPage({ params }: { params: Params }) {
  const [loc, spec] = await Promise.all([
    getLocalityBySlug(params.locality),
    getSpecializationBySlug(params.specialty)
  ]);
  if (!loc || !spec) notFound();

  const results = await searchDoctors({
    locality: loc.name,
    specialty: spec.name,
    sort: "rating",
    pageSize: 60
  });

  return (
    <div className="container-page py-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: `Doctors in ${loc.name}`, href: `/localities/${loc.slug}` },
          { label: `${spec.name} in ${loc.name}` }
        ]}
      />

      <header className="mt-3">
        <h1 className="h2">
          Best {spec.name} in {loc.name}, Lucknow
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Looking for a {spec.name.toLowerCase()} in {loc.name}, Lucknow? Hanuone lists verified
          {" "}{spec.name.toLowerCase()}s practicing in and around {loc.name} with full transparency on
          qualifications, experience, fees and patient ratings. Contact directly on WhatsApp — no
          booking fees, no spam.
        </p>
      </header>

      <section className="mt-6">
        <div className="mb-3 text-sm text-muted">
          {results.total} {results.total === 1 ? "doctor" : "doctors"} found
        </div>
        <DoctorList
          doctors={results.doctors}
          emptyMessage={`No ${spec.name.toLowerCase()}s listed in ${loc.name} yet.`}
        />
      </section>
    </div>
  );
}
