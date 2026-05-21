"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Plus, Trash2 } from "lucide-react";
import type { Availability } from "@/lib/types";

export default function AvailabilityPage() {
  const supabase = createClient();
  const [slots, setSlots] = useState<Availability[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [loading, setLoading] = useState(false);
  const [profId, setProfId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("professionals").select("id").eq("user_id", user.id).single();
      if (prof) {
        setProfId(prof.id);
        loadSlots(prof.id);
      }
    })();
  }, []);

  async function loadSlots(id: string) {
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("professional_id", id)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(50);
    setSlots(data ?? []);
  }

  async function addSlot() {
    if (!profId) return;
    setLoading(true);
    await supabase.from("availability").insert({
      professional_id: profId,
      date,
      start_time: startTime,
      end_time: endTime
    });
    await loadSlots(profId);
    setLoading(false);
  }

  async function deleteSlot(id: string) {
    if (!profId) return;
    await supabase.from("availability").delete().eq("id", id);
    await loadSlots(profId);
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Availability</h1>
      <p className="mt-1 text-sm text-muted">Mark when you're available for gigs.</p>

      <div className="mt-6 card p-5">
        <h2 className="text-sm font-semibold text-ink">Add a slot</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
          </div>
          <div className="flex items-end">
            <button onClick={addSlot} disabled={loading} className="btn-primary w-full">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-ink">Upcoming slots</h2>
        {slots.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No slots marked yet. Add one above.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {slots.map((s) => (
              <div key={s.id} className="card flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-ink">{s.date}</span>
                  <span className="ml-3 text-sm text-muted">{s.start_time} - {s.end_time}</span>
                  {s.is_booked && <span className="ml-2 badge badge-completed">Booked</span>}
                </div>
                {!s.is_booked && (
                  <button onClick={() => deleteSlot(s.id)} className="text-muted hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
