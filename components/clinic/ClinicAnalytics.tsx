"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/portal/ui";

type Day = { day: string; appts: number; revenue: number };
type StatusSlice = { name: string; value: number };

const STATUS_COLORS = ["#16a34a", "#0284c7", "#FE7D15", "#7c3aed", "#94a3b8"];

export default function ClinicAnalytics({ days, statusMix, topServices }: { days: Day[]; statusMix: StatusSlice[]; topServices: { name: string; value: number }[] }) {
  const hasAppts = days.some((d) => d.appts > 0);
  const hasRevenue = days.some((d) => d.revenue > 0);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title="Appointments — last 14 days" className="lg:col-span-2">
        {!hasAppts ? <p className="py-12 text-center text-sm text-slate-500">No appointments in the last 14 days yet.</p> : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={days} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="appts" fill="#01586C" radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard title="Revenue trend">
        {!hasRevenue ? <p className="py-12 text-center text-sm text-slate-500">No revenue recorded yet.</p> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={days} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
            <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.3} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(v: number) => [`₹${v}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </SectionCard>

      <SectionCard title="Appointment status">
        {statusMix.every((s) => s.value === 0) ? <p className="py-8 text-center text-sm text-slate-400">No data yet.</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusMix.filter((s) => s.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {statusMix.filter((s) => s.value > 0).map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
          {statusMix.filter((s) => s.value > 0).map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />{s.name} ({s.value})</span>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Top services" className="lg:col-span-2">
        {topServices.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No services yet.</p> : (
          <div className="space-y-2">
            {topServices.map((s) => {
              const max = Math.max(...topServices.map((x) => x.value));
              return (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-32 truncate text-sm text-slate-600">{s.name}</div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#01586C]" style={{ width: `${(s.value / max) * 100}%` }} /></div>
                  <div className="w-8 text-right text-sm font-semibold text-slate-700">{s.value}</div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
