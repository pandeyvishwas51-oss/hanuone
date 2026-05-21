export const dynamic = "force-dynamic";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge badge-pending",
  confirmed: "badge badge-verified",
  in_progress: "badge bg-blue-100 text-blue-800",
  completed: "badge badge-completed",
  cancelled: "badge badge-rejected"
};

export default async function AdminBookingsPage() {
  const rows = await db()
    .select({
      id: schema.bookings.id,
      patientName: schema.bookings.patientName,
      patientPhone: schema.bookings.patientPhone,
      serviceType: schema.bookings.serviceType,
      bookingDate: schema.bookings.bookingDate,
      status: schema.bookings.status,
      amount: schema.bookings.amount,
      paymentStatus: schema.bookings.paymentStatus,
      professional: schema.professionals.fullName,
      role: schema.professionals.role
    })
    .from(schema.bookings)
    .leftJoin(schema.professionals, eq(schema.bookings.professionalId, schema.professionals.id))
    .orderBy(desc(schema.bookings.createdAt))
    .limit(200);
  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">Bookings</h1>
      <p className="mt-1 text-sm text-muted">All bookings across the platform.</p>
      <div className="mt-6 card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-bg/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Professional</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.patientName}</div>
                  <div className="text-xs text-muted">{r.patientPhone}</div>
                </td>
                <td className="px-4 py-3">{r.serviceType}</td>
                <td className="px-4 py-3">
                  <div>{r.professional || "Unassigned"}</div>
                  {r.role && <div className="text-xs text-muted capitalize">{r.role.replace("_", " ")}</div>}
                </td>
                <td className="px-4 py-3">{r.bookingDate}</td>
                <td className="px-4 py-3">{r.amount ? `INR ${r.amount}` : "-"}</td>
                <td className="px-4 py-3 capitalize">{r.paymentStatus}</td>
                <td className="px-4 py-3"><span className={STATUS_BADGE[r.status ?? "pending"] || "badge"}>{(r.status ?? "pending").replace("_", " ")}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
