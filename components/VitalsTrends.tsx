"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export type VitalPoint = {
  date: string;
  bp?: number | null;
  heartRate?: number | null;
  spo2?: number | null;
  sugar?: number | null;
};

const SERIES: { key: keyof VitalPoint; label: string; color: string }[] = [
  { key: "bp", label: "BP (systolic)", color: "#0F4C5C" },
  { key: "heartRate", label: "Heart rate", color: "#F26419" },
  { key: "spo2", label: "SpO₂", color: "#2A9D8F" },
  { key: "sugar", label: "Blood sugar", color: "#9B5DE5" }
];

export default function VitalsTrends({ data }: { data: VitalPoint[] }) {
  if (data.length < 2) {
    return <p className="text-sm text-muted">Record at least two checkups to see trends.</p>;
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {SERIES.map((sr) => {
        const has = data.some((d) => d[sr.key] != null);
        if (!has) return null;
        return (
          <div key={sr.key} className="card p-4">
            <div className="text-sm font-semibold text-ink">{sr.label}</div>
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey={sr.key} stroke={sr.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
