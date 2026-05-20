import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorList from "@/components/DoctorList";
import SpecialtyIcon from "@/components/SpecialtyIcon";
import {
  getAllLocalities,
  getAllSpecializations,
  getLocalityBySlug,
  searchDoctors
} from "@/lib/queries";

export const revalidate = 3600;

export async function generateStaticParams() {
  const localities = await getAllLocalities();
  return localities.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const loc = await getLocalityBySlug(params.slug);
  if (!loc) return { title: "Locality not found" };
  const title = `Doctors in ${loc.name}, Lucknow, Find & Contact`;
  const description = `Discover verified doctors in ${loc.name}, Lucknow. Compare specialties, ratings and consultation fees. Contact via WhatsApp directly on Hanuone.`;
  return {
    title,
    description,
    alternates: { canonical: `/localities/${loc.slug}` },
    openGraph: { title, description }
  };
}

export default async function LocalityPage({ params }: { params: { slug: string } }) {
  const loc = await getLocalityBySlug(params.slug);
  if (!loc) notFound();

  const [specs, results] = await Promise.all([
    getAllSpecializations(),
    searchDoctors({ locality: loc.name, sort: "rating", pageSize: 60 })
  ]);

  return (
    <div className="container-page py-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Localities", href: "/doctors" },
          { label: `${loc.name}, Lucknow` }
        ]}
      />

      <header className="mt-3">
        <h1 className="h2">Doctors in {loc.name}, Lucknow</h1>
        {loc.name_hindi && <p className="hi mt-1 text-sm text-muted">{loc.name_hindi}</p>}
        <p className="mt-3 max-w-3xl text-sm text-muted">
          {loc.name} is one of Lucknow's well-served localities, with clinics, diagnostic centres,
          and multi-specialty hospitals close at hand. Hanuone lists verified doctors across every
          major specialty in {loc.name}, from cardiologists and gynecologists to pediatricians and
          dermatologists, so families can find the right care nearby. Browse the doctors below or
          jump straight to a specialty.
        </p>
      </header>

      <section className="mt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Browse by specialty</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {specs.slice(0, 12).map((s) => (
            <a key={s.slug} href={`/${loc.slug}/${s.slug}`} className="chip">
              <SpecialtyIcon specialty={s.slug || s.name} size={12} />
              {s.name} in {loc.name}
            </a>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 text-sm text-muted">
          {results.total} {results.total === 1 ? "doctor" : "doctors"} found
        </div>
        <DoctorList doctors={results.doctors} emptyMessage={`No doctors listed in ${loc.name} yet.`} />
      </section>
    </div>
  );
}
