import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page grid place-items-center py-24 text-center">
      <div>
        <div className="text-6xl">🩺</div>
        <h1 className="h2 mt-4">We couldn't find that page</h1>
        <p className="mt-2 text-muted">It may have moved, or never existed.</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Back to Hanuone
        </Link>
      </div>
    </div>
  );
}
