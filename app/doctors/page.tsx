import type { Metadata } from "next";
import { Suspense } from "react";
import FilterSidebar from "@/components/FilterSidebar";
import DoctorList from "@/components/DoctorList";
import SortSelect from "@/components/SortSelect";
import Pagination from "@/components/Pagination";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import {
  getAllSpecializations,
  getAllLocalities,
  searchDoctors
} from "@/lib/queries";
import { asArray, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function parseParams(searchParams: SP) {
  const num = (v: string | string[] | undefined) => {
    if (Array.isArray(v)) v = v[0];
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const oneOf = (v: string | string[] | undefined, allowed: string[]) => {
    if (Array.isArray(v)) v = v[0];
    return v && allowed.includes(v) ? v : undefined;
  };
  const str = (v: string | string[] | undefined) => {
    if (Array.isArray(v)) v = v[0];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  return {
    q: typeof searchParams.q === "string" ? searchParams.q : undefined,
    pincode: str(searchParams.pincode),
    specialty: asArray(searchParams.specialty),
    locality: asArray(searchParams.locality),
    feeMin: num(searchParams.feeMin),
    feeMax: num(searchParams.feeMax),
    minRating: num(searchParams.minRating),
    sort: oneOf(searchParams.sort, ["relevance", "rating", "fee_low", "fee_high", "experience"]) as
      | "relevance"
      | "rating"
      | "fee_low"
      | "fee_high"
      | "experience"
      | undefined,
    page: num(searchParams.page) ?? 1
  };
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: SP;
}): Promise<Metadata> {
  const p = parseParams(searchParams);
  const spec = p.specialty[0];
  const loc = p.locality[0];
  const pin = p.pincode;
  const titleParts: string[] = [];
  if (spec) titleParts.push(`Best ${titleCase(spec)}s`);
  else titleParts.push("Verified Doctors");
  if (loc) titleParts.push(`in ${titleCase(loc)}`);
  if (pin) titleParts.push(`near ${pin}`);
  titleParts.push("Lucknow");
  const title = titleParts.join(" ");
  const description = `Find ${title.toLowerCase()} on Hanuone. Compare ratings, fees, experience and contact directly via WhatsApp. Free, verified, and updated weekly.`;
  return {
    title,
    description,
    alternates: { canonical: "/doctors" },
    openGraph: { title, description, url: "/doctors", type: "website" },
    twitter: { card: "summary_large_image", title, description }
  };
}

export default async function DoctorsPage({ searchParams }: { searchParams: SP }) {
  const p = parseParams(searchParams);
  const searchInput = p.pincode ? p.pincode : p.q;
  const [specializations, localities, results] = await Promise.all([
    getAllSpecializations(),
    getAllLocalities(),
    searchDoctors({ ...p, q: searchInput })
  ]);

  const heading =
    p.specialty[0]
      ? `${titleCase(p.specialty[0])}s${p.locality[0] ? ` in ${titleCase(p.locality[0])}` : ""} in Lucknow`
      : p.locality[0]
      ? `Doctors in ${titleCase(p.locality[0])}, Lucknow`
      : p.pincode
      ? `Doctors near pincode ${p.pincode}, Lucknow`
      : "All doctors in Lucknow";

  return (
    <div className="container-page py-8">
      <BreadcrumbNav
        items={[
          { label: "Home", href: "/" },
          { label: "Doctors", href: "/doctors" },
          { label: heading }
        ]}
      />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h2">{heading}</h1>
          <p className="text-sm text-muted">
            {results.total} {results.total === 1 ? "doctor" : "doctors"} found
          </p>
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[260px,1fr]">
        <Suspense>
          <FilterSidebar specializations={specializations} localities={localities} />
        </Suspense>
        <div>
          <DoctorList doctors={results.doctors} />
          <Pagination
            baseUrl="/doctors"
            searchParams={searchParams}
            page={results.page}
            pageSize={results.pageSize}
            total={results.total}
          />
        </div>
      </div>
    </div>
  );
}
