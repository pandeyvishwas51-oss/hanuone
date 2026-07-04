import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorList from "@/components/DoctorList";
import SpecialtyIcon from "@/components/SpecialtyIcon";
import FaqSection from "@/components/FaqSection";
import {
  getAllLocalities,
  getAllSpecializations,
  getSpecializationBySlug,
  searchDoctors
} from "@/lib/queries";
import {
  breadcrumbJsonLd,
  doctorItemListJsonLd,
  medicalSpecialtyJsonLd,
  medicalWebPageJsonLd,
  speakableJsonLd,
  specialtyAnswer,
  specialtyFaqs,
  SITE
} from "@/lib/seo";
import AnswerBlock from "@/components/AnswerBlock";
import JsonLd from "@/components/JsonLd";

export const revalidate = 3600;

// Pre-render a slice at build; the rest render on-demand via ISR (revalidate
// above) and cache — still indexable, keeps the build fast.
export async function generateStaticParams() {
  const specs = await getAllSpecializations();
  return specs.slice(0, 150).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const spec = await getSpecializationBySlug(params.slug);
  if (!spec) return { title: "Specialty not found" };
  const title = `Best ${spec.name} in Lucknow (2026), Verified Profiles & Fees`;
  const description = `Top ${spec.name.toLowerCase()}s in Lucknow with ratings, qualifications and consultation fees. Compare profiles and contact directly via WhatsApp on Hanuone.`;
  return {
    title,
    description,
    alternates: { canonical: `/specializations/${spec.slug}` },
    openGraph: { title, description, url: `/specializations/${spec.slug}`, type: "website", images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage] }
  };
}

export default async function SpecializationPage({ params }: { params: { slug: string } }) {
  const spec = await getSpecializationBySlug(params.slug);
  if (!spec) notFound();

  const [localities, results] = await Promise.all([
    getAllLocalities(),
    searchDoctors({ specialty: spec.name, sort: "rating", pageSize: 60 })
  ]);

  const description =
    spec.description ||
    `Looking for a trusted ${spec.name.toLowerCase()} in Lucknow? Hanuone lists verified ${spec.name.toLowerCase()}s across major localities including Gomtinagar, Hazratganj, Aliganj and Indira Nagar. Each profile shows qualifications, experience, consultation fees and a direct WhatsApp link to the clinic.`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", href: "/" },
              { name: "Specialties", href: "/doctors" },
              { name: `${spec.name}s in Lucknow`, href: `/specializations/${spec.slug}` }
            ])
          )
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            medicalSpecialtyJsonLd({
              specialty: spec.name,
              url: `/specializations/${spec.slug}`,
              description,
              doctorCount: results.total
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
            url: `/specializations/${spec.slug}`,
            name: `Best ${spec.name}s in Lucknow`,
            description: specialtyAnswer(spec.name, "Lucknow", results.total)
          }),
          speakableJsonLd(`/specializations/${spec.slug}`)
        ]}
      />

      <div className="container-page py-8">
        <BreadcrumbNav
          items={[
            { label: "Home", href: "/" },
            { label: "Specialties", href: "/doctors" },
            { label: `${spec.name}s in Lucknow` }
          ]}
        />

        <header className="mt-3 flex items-start gap-4">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-primary/10">
            <SpecialtyIcon specialty={spec.slug || spec.name} size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="h2">Best {spec.name}s in Lucknow</h1>
            <p className="mt-3 max-w-3xl text-sm text-muted">{description}</p>
          </div>
        </header>

        <div className="mt-5">
          <AnswerBlock
            question={`How do I find the best ${spec.name.toLowerCase()} in Lucknow?`}
            answer={specialtyAnswer(spec.name, "Lucknow", results.total)}
          />
        </div>

        <section className="mt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Browse by locality
          </div>
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
            emptyMessage={`No ${spec.name.toLowerCase()}s listed yet, check back soon.`}
          />
        </section>
      </div>

      <FaqSection
        title={`FAQs about ${spec.name}s in Lucknow`}
        faqs={specialtyFaqs(spec.name)}
      />
    </>
  );
}
