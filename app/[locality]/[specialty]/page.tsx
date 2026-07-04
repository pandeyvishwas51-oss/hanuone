import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import DoctorList from "@/components/DoctorList";
import FaqSection from "@/components/FaqSection";
import AnswerBlock from "@/components/AnswerBlock";
import JsonLd from "@/components/JsonLd";
import {
  getCombinationsForStaticParams,
  getLocalityBySlug,
  getSpecializationBySlug,
  searchDoctors
} from "@/lib/queries";
import {
  breadcrumbJsonLd,
  doctorItemListJsonLd,
  medicalWebPageJsonLd,
  medicalSpecialtyJsonLd,
  speakableJsonLd,
  comboAnswer,
  comboFaqs,
  SITE
} from "@/lib/seo";

export const revalidate = 3600;

type Params = { locality: string; specialty: string };

// Pre-render a high-value slice at build time; the long tail renders on-demand
// via ISR (dynamicParams defaults to true, revalidate above) and is cached +
// still fully indexable. Keeps builds fast/reliable instead of pre-rendering
// thousands of DB-backed pages against a remote DB on every deploy.
export async function generateStaticParams() {
  return (await getCombinationsForStaticParams()).slice(0, 100);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [loc, spec] = await Promise.all([
    getLocalityBySlug(params.locality),
    getSpecializationBySlug(params.specialty)
  ]);
  if (!loc || !spec) return { title: "Page not found" };
  const title = `Best ${spec.name} in ${loc.name}, Lucknow (2026)`;
  const description = `Top-rated ${spec.name.toLowerCase()}s in ${loc.name}, Lucknow. Compare ratings, fees and qualifications. Direct WhatsApp contact on Hanuone.`;
  return {
    title,
    description,
    alternates: { canonical: `/${loc.slug}/${spec.slug}` },
    openGraph: { title, description, url: `/${loc.slug}/${spec.slug}`, type: "website", images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [SITE.ogImage] }
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

  const url = `/${loc.slug}/${spec.slug}`;
  const city = "Lucknow";
  const answer = comboAnswer(spec.name, loc.name, city, results.total);
  const faqs = comboFaqs(spec.name, loc.name, city);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", href: "/" },
            { name: `Doctors in ${loc.name}`, href: `/localities/${loc.slug}` },
            { name: `${spec.name} in ${loc.name}`, href: url }
          ]),
          doctorItemListJsonLd(results.doctors),
          medicalWebPageJsonLd({
            url,
            name: `Best ${spec.name} in ${loc.name}, ${city}`,
            description: answer
          }),
          medicalSpecialtyJsonLd({
            specialty: spec.name,
            city: `${loc.name}, ${city}`,
            url,
            description: answer,
            doctorCount: results.total
          }),
          speakableJsonLd(url)
        ]}
      />

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
            Best {spec.name} in {loc.name}, {city}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Looking for a {spec.name.toLowerCase()} in {loc.name}, {city}? Hanuone lists verified
            {" "}{spec.name.toLowerCase()}s practising in and around {loc.name} with full transparency on
            qualifications, experience, fees and patient ratings. Contact directly on WhatsApp, no
            booking fees, no spam.
          </p>
        </header>

        <div className="mt-5">
          <AnswerBlock
            question={`Who is the best ${spec.name.toLowerCase()} in ${loc.name}, ${city}?`}
            answer={answer}
            updated={new Date().toISOString().slice(0, 10)}
          />
        </div>

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

      <FaqSection
        title={`FAQs about ${spec.name}s in ${loc.name}`}
        faqs={faqs}
      />
    </>
  );
}
