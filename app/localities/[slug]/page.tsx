import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorList from "@/components/DoctorList";
import SpecialtyIcon from "@/components/SpecialtyIcon";
import FaqSection from "@/components/FaqSection";
import {
  getAllLocalities,
  getAllSpecializations,
  getLocalityBySlug,
  searchDoctors
} from "@/lib/queries";
import {
  breadcrumbJsonLd,
  doctorItemListJsonLd,
  localityAnswer,
  localityFaqs,
  medicalWebPageJsonLd,
  placeJsonLd,
  speakableJsonLd,
  SITE
} from "@/lib/seo";
import AnswerBlock from "@/components/AnswerBlock";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600;

// Pre-render a slice at build; the rest render on-demand via ISR (revalidate
// above) and cache — still indexable, keeps the build fast.
export async function generateStaticParams() {
  const localities = await getAllLocalities();
  return localities.slice(0, 150).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const loc = await getLocalityBySlug(params.slug);
  if (!loc) return { title: "Locality not found" };
  const title = `Doctors in ${loc.name}, Lucknow (2026), Verified Profiles`;
  const description = `Find verified doctors in ${loc.name}, Lucknow with ratings, fees and timings. Cardiologists, gynecologists, paediatricians, orthopaedics and more, on Hanuone.`;
  return {
    title,
    description,
    alternates: { canonical: `/localities/${loc.slug}` },
    openGraph: { title, description, url: `/localities/${loc.slug}`, type: "website", images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage] }
  };
}

export default async function LocalityPage({ params }: { params: { slug: string } }) {
  const loc = await getLocalityBySlug(params.slug);
  if (!loc) notFound();

  const [specs, results] = await Promise.all([
    getAllSpecializations(),
    searchDoctors({ locality: loc.name, sort: "rating", pageSize: 60 })
  ]);

  const description = `${loc.name} is one of Lucknow's well-served localities, with clinics, diagnostic centres and multi-specialty hospitals close at hand. Hanuone lists verified doctors across every major specialty in ${loc.name}, from cardiologists and gynecologists to paediatricians and dermatologists.`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", href: "/" },
              { name: "Localities", href: "/doctors" },
              { name: `${loc.name}, Lucknow`, href: `/localities/${loc.slug}` }
            ])
          )
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            placeJsonLd({
              locality: loc.name,
              url: `/localities/${loc.slug}`,
              description,
              lat: loc.lat,
              lng: loc.lng
            })
          )
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(doctorItemListJsonLd(results.doctors))
        }}
      />
      <JsonLd
        data={[
          medicalWebPageJsonLd({
            url: `/localities/${loc.slug}`,
            name: `Doctors in ${loc.name}, Lucknow`,
            description: localityAnswer(loc.name, "Lucknow", results.total)
          }),
          speakableJsonLd(`/localities/${loc.slug}`)
        ]}
      />

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
          <p className="mt-3 max-w-3xl text-sm text-muted">{description}</p>
        </header>

        <div className="mt-5">
          <AnswerBlock
            question={`How many doctors are listed in ${loc.name}, Lucknow?`}
            answer={localityAnswer(loc.name, "Lucknow", results.total)}
          />
        </div>

        <section className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Browse by specialty
          </div>
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
          <DoctorList
            doctors={results.doctors}
            emptyMessage={`No doctors listed in ${loc.name} yet.`}
          />
        </section>
      </div>

      <FaqSection
        title={`FAQs about doctors in ${loc.name}`}
        faqs={localityFaqs(loc.name)}
      />
    </>
  );
}
