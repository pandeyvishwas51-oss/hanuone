"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

type Profile = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: string;
  specialization: string | null;
  experienceYears: number | null;
  bio: string | null;
  locality: string | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  isAvailable: boolean | null;
  status: string;
  profilePhotoUrl: string | null;
  aadhaarUrl: string | null;
  certificateUrls: string[] | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/profile");
      const data = await r.json();
      if (data.ok) setProfile(data.profile);
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    setMsg("");
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.fullName,
        phone: profile.phone,
        specialization: profile.specialization,
        experienceYears: profile.experienceYears,
        locality: profile.locality,
        hourlyRate: profile.hourlyRate,
        dailyRate: profile.dailyRate,
        bio: profile.bio,
        isAvailable: profile.isAvailable
      })
    });
    const data = await r.json();
    setSaving(false);
    setMsg(data.ok ? "Saved" : data.error || "Could not save");
  }

  async function upload(kind: "aadhaar" | "certificate" | "profile_photo", file: File) {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await r.json();
    if (!data.ok) return setMsg(data.error || "Upload failed");
    // refresh profile
    const r2 = await fetch("/api/profile");
    const d2 = await r2.json();
    if (d2.ok) setProfile(d2.profile);
    setMsg("Uploaded");
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
            <input className="input" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
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
            <input type="number" className="input" value={profile.experienceYears ?? ""} onChange={(e) => setProfile({ ...profile, experienceYears: e.target.value ? parseInt(e.target.value) : null })} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Hourly rate (INR)</label>
            <input type="number" className="input" value={profile.hourlyRate ?? ""} onChange={(e) => setProfile({ ...profile, hourlyRate: e.target.value ? parseInt(e.target.value) : null })} />
          </div>
          <div>
            <label className="label">Daily rate (INR)</label>
            <input type="number" className="input" value={profile.dailyRate ?? ""} onChange={(e) => setProfile({ ...profile, dailyRate: e.target.value ? parseInt(e.target.value) : null })} />
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!profile.isAvailable} onChange={(e) => setProfile({ ...profile, isAvailable: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary" />
          Available for gigs
        </label>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save changes"}
        </button>
        {msg && <div className="text-xs text-emerald-700">{msg}</div>}
      </div>

      <div className="mt-6 card p-5 sm:p-6 max-w-2xl">
        <h2 className="text-sm font-semibold text-ink">Documents</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DocSlot
            label="Aadhaar"
            current={profile.aadhaarUrl}
            onUpload={(f) => upload("aadhaar", f)}
          />
          <DocSlot
            label="Profile photo"
            current={profile.profilePhotoUrl}
            onUpload={(f) => upload("profile_photo", f)}
          />
        </div>
        <div className="mt-4">
          <label className="label">Add a certificate</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 hover:border-primary/40">
            <Upload size={16} className="text-muted" />
            <span className="text-sm text-muted">Upload (max 5MB, PDF/JPG/PNG)</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload("certificate", f);
              }}
            />
          </label>
          {profile.certificateUrls && profile.certificateUrls.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {profile.certificateUrls.map((u, i) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener" className="text-primary hover:underline">
                    Certificate {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DocSlot({ label, current, onUpload }: { label: string; current: string | null; onUpload: (f: File) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-4 hover:border-primary/40">
        <Upload size={16} className="text-muted" />
        <span className="text-sm text-muted">{current ? "Replace" : "Upload"}</span>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }} />
      </label>
      {current && (
        <a href={current} target="_blank" rel="noopener" className="mt-1 inline-block text-xs text-primary hover:underline">
          View current
        </a>
      )}
    </div>
  );
}
