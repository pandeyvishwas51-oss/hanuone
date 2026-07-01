import TrackingView from "@/components/TrackingView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track your visit | HanuONE", robots: { index: false } };

export default function TrackVisitPage({ params }: { params: { id: string } }) {
  return (
    <div className="container-page py-8">
      <h1 className="h2 text-center">Track your home visit</h1>
      <p className="mt-1 text-center text-sm text-muted">Follow your professional on the way to you, live.</p>
      <div className="mt-6">
        <TrackingView visitId={params.id} />
      </div>
    </div>
  );
}
