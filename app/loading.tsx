export default function Loading() {
  return (
    <div className="container-page py-12">
      <div className="card animate-pulse p-8">
        <div className="h-6 w-1/3 rounded bg-slate-100" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="h-40 rounded bg-slate-100" />
          <div className="h-40 rounded bg-slate-100" />
          <div className="h-40 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
