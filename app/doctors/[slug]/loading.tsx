/**
 * Route-level loading UI for a doctor profile. Without this, the parent
 * /doctors directory's grid skeleton would show during the profile's data
 * fetch (3 awaits) — a layout mismatch. This mirrors the real profile shape
 * (hero + content + contact aside) so the page shimmers in place.
 */
export default function DoctorProfileLoading() {
  return (
    <div className="container-page py-6 pb-36 sm:py-10 sm:pb-10">
      <div className="h-4 w-56 skeleton rounded" />

      {/* Hero card */}
      <section className="card mt-4 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[160px,1fr,260px] md:p-8">
          <div className="mx-auto h-32 w-32 skeleton rounded-2xl md:h-40 md:w-40" />
          <div className="space-y-3">
            <div className="h-7 w-64 skeleton rounded-lg" />
            <div className="h-4 w-40 skeleton rounded" />
            <div className="mt-4 flex flex-wrap gap-2">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-4 w-24 skeleton rounded" />)}
            </div>
            <div className="mt-4 h-5 w-32 skeleton rounded" />
          </div>
          <div className="card space-y-3 bg-bg p-5">
            <div className="h-3 w-20 skeleton rounded" />
            <div className="h-4 w-40 skeleton rounded" />
            <div className="h-10 w-full skeleton rounded-lg" />
            <div className="h-10 w-full skeleton rounded-lg" />
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,300px]">
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <section key={i} className="card space-y-3 p-6">
              <div className="h-5 w-40 skeleton rounded" />
              <div className="h-3 w-full skeleton rounded" />
              <div className="h-3 w-5/6 skeleton rounded" />
              <div className="h-3 w-4/6 skeleton rounded" />
            </section>
          ))}
        </div>
        <aside>
          <div className="card space-y-3 p-5">
            <div className="h-3 w-24 skeleton rounded" />
            <div className="h-4 w-40 skeleton rounded" />
            <div className="h-10 w-full skeleton rounded-lg" />
            <div className="h-10 w-full skeleton rounded-lg" />
          </div>
        </aside>
      </div>
    </div>
  );
}
