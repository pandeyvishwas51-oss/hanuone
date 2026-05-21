"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { Professional } from "@/lib/types";

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Professional | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("professionals").select("*").eq("user_id", user.id).single();
      if (data) setProfile(data as Professional);
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true); setMsg("");
    const { error } = await supabase.from("professionals").update({
      full_name: profile.full_name,
      phone: profile.phone,
      specialization: profile.specialization,
      experience_years: profile.experience_years,
      locality: profile.locality,
      hourly_rate: profile.hourly_rate,
      daily_rate: profile.daily_rate,
      bio: profile.bio,
      is_available: profile.is_available
    }).eq("id", profile.id);
    setSaving(false);
    setMsg(error ? error.message : "Saved");
  }

  if (!profile) return <div className="text-sm text-muted">Loading...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">Your Profile</h1>
      <p className="mt-1 text-sm text-muted">Keep your details up to date for better gig matches.</p>

      <div className="mt-6 card p-5 sm:p-6 space-y-4 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Specialization</label>
            <input className="input" value={profile.specialization ?? ""} onChange={(e) => setProfile({ ...profile, specialization: e.target.value })} />
          </div>
          <div>
            <label className="label">Experience (years)</label>
            <input type="number" className="input" value={profile.experience_years ?? ""} onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) || null })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Hourly rate (INR)</label>
            <input type="number" className="input" value={profile.hourly_rate ?? ""} onChange={(e) => setProfile({ ...profile, hourly_rate: parseInt(e.target.value) || null })} />
          </div>
          <div>
            <label className="label">Daily rate (INR)</label>
            <input type="number" className="input" value={profile.daily_rate ?? ""} onChange={(e) => setProfile({ ...profile, daily_rate: parseInt(e.target.value) || null })} />
          </div>
        </div>
        <div>
          <label className="label">Locality</label>
          <input className="input" value={profile.locality ?? ""} onChange={(e) => setProfile({ ...profile, locality: e.target.value })} />
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input min-h-[100px]" value={profile.bio ?? ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={profile.is_available} onChange={(e) => setProfile({ ...profile, is_available: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary" />
            Available for gigs
          </label>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save changes"}
        </button>
        {msg && <div className="text-xs text-emerald-700">{msg}</div>}
      </div>
    </div>
  );
}
