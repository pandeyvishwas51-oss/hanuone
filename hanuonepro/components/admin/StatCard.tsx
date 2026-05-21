import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tint?: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
};

export default function StatCard({ label, value, icon: Icon, tint = "bg-primary/10 text-primary", delta, hint }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${tint}`}>
          <Icon size={20} />
        </div>
        {delta && (
          <span className={`text-xs font-semibold ${delta.positive ? "text-emerald-600" : "text-red-600"}`}>
            {delta.value}
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
