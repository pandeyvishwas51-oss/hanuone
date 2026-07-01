export default function Loading() {
  return (
    <div className="container-page py-12">
      <div className="card p-8">
        <div className="skeleton h-6 w-1/3 rounded" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="skeleton h-40 rounded" />
          <div className="skeleton h-40 rounded" />
          <div className="skeleton h-40 rounded" />
        </div>
      </div>
    </div>
  );
}
