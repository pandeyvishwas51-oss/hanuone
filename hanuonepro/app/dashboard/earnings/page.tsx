"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Earning } from "@/lib/types";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

export default function EarningsPage() {
  const supabase = createClient();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("professionals").select("id").eq("user_id", user.id).single();
      if (!prof) return;
      const { data } = await supabase
        .from("earnings")
        .select("*")
        .eq("professional_id", prof.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = data ?? [];
      setEarnings(rows);
      setTotal(rows.reduce((s, e) => s + (e.type === "credit" ? e.amount : -e.amount), 0));
    })();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Earnings</h1>
      <p className="mt-1 text-sm text-muted">Track your income from completed gigs.</p>

      <div className="mt-6 card flex items-center gap-4 p-6">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <Wallet size={22} />
        </div>
        <div>
          <div className="text-3xl font-bold text-ink">INR {total.toLocaleString("en-IN")}</div>
          <div className="text-xs text-muted">Net balance</div>
        </div>
      </div>

      {earnings.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No transactions yet.</p>
      ) : (
        <div className="mt-6 space-y-2">
          {earnings.map((e) => (
            <div key={e.id} className="card flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {e.type === "credit" ? (
                  <ArrowDownLeft size={16} className="text-emerald-600" />
                ) : (
                  <ArrowUpRight size={16} className="text-red-500" />
                )}
                <div>
                  <div className="text-sm text-ink">{e.description || e.type}</div>
                  <div className="text-[11px] text-muted">{new Date(e.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <span className={`text-sm font-semibold ${e.type === "credit" ? "text-emerald-600" : "text-red-600"}`}>
                {e.type === "credit" ? "+" : "-"} INR {e.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
