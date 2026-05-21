"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Slot = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean | null;
};

type ApiSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean | null;
};

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/availability");
    const data = await r.json();
    if (data.ok) {
      setSlots(
        (data.slots as ApiSlot[]).map((s) => ({
          id: s.id,
          date: s.date,
          start_time: s.startTime,
          end_time: s.endTime,
          is_booked: s.isBooked
        }))
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addSlot() {
    setLoading(true);
    setError("");
    const r = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, startTime, endTime })
    });
    const data = await r.json();
    setLoading(false);
    if (!r.ok || !data.ok) {
      setError(data.error || "Could not add slot");
      return;
    }
    await load();
  }

  async function deleteSlot(id: string) {
    await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Availability</h1>
      <p className="mt-1 text-sm text-muted">Mark when you are available for gigs.</p>

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
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
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
