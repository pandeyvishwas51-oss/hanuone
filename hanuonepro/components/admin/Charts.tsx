"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

const COLORS = ["#0F4C5C", "#FF6B35", "#FFD9C7", "#0E2A33", "#48BFE3", "#80FFDB", "#7400B8", "#5390D9", "#48BFE3", "#56CFE1"];

export function TimeseriesArea({ data, label, color = "#0F4C5C" }: { data: { date: string; count: number }[]; label: string; color?: string }) {
  const fmt = (d: unknown) => {
    if (typeof d !== "string") return "";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={fmt} />
        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} labelFormatter={(l) => fmt(l)} />
        <Area type="monotone" dataKey="count" name={label} stroke={color} strokeWidth={2} fill={`url(#g-${label})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBar({ data, color = "#FF6B35" }: { data: { name: string; count: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} width={120} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
        <Bar dataKey="count" fill={color} radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
        <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
