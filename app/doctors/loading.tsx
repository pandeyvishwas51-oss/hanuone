/**
 * Route-level loading UI for /doctors. Next.js shows this instantly during
 * filter/sort/pincode navigations (which re-run searchDoctors on the server),
 * so the directory shimmers instead of freezing on the old results.
 */
export default function DoctorsLoading() {
  return (
    <div className="container-page py-8">
      <div className="h-4 w-48 skeleton rounded" />
      <div className="mt-3 h-8 w-72 skeleton rounded-lg" />

      <div className="mt-6 grid gap-4 lg:grid-cols-[260px,1fr]">
        {/* Filter sidebar placeholder (desktop) */}
        <div className="hidden lg:block">
          <div className="card space-y-3 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-full skeleton rounded-lg" />
            ))}
          </div>
        </div>

        {/* Results grid placeholder */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-primary/10 bg-white p-4">
              <div className="flex items-start gap-3.5">
                <div className="h-16 w-16 flex-none skeleton rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 skeleton rounded" />
                  <div className="h-3 w-24 skeleton rounded" />
                  <div className="h-3 w-20 skeleton rounded" />
                </div>
              </div>
              <div className="mt-3 h-3 w-40 skeleton rounded" />
              <div className="mt-3 border-t border-primary/5 pt-3">
                <div className="h-8 w-full skeleton rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
