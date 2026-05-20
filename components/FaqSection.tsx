import { faqJsonLd } from "@/lib/seo";

export default function FaqSection({
  title = "Frequently asked questions",
  faqs
}: {
  title?: string;
  faqs: { q: string; a: string }[];
}) {
  return (
    <section className="section pt-0">
      <div className="container-page">
        <h2 className="h2">{title}</h2>
        <div className="mt-5 grid gap-3">
          {faqs.map((f, i) => (
            <details key={i} className="card group p-5 open:shadow-lg">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink">
                <span>{f.q}</span>
                <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary/10 text-primary transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
        />
      </div>
    </section>
  );
}
