"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { NURSING_SERVICES, NURSE_TIERS, CITY, getDoctor } from "@/lib/data";

export default function NursingBooking() {
  const params = useSearchParams();
  const withDoctor = params.get("withDoctor");
  const doctor = withDoctor ? getDoctor(withDoctor) : undefined;

  const [serviceId, setServiceId] = useState<string>(doctor ? "consult-support" : "");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const service = NURSING_SERVICES.find((s) => s.id === serviceId);
  const canSubmit = serviceId && address && date && time;

  if (submitted && service) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-3xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Nursing visit requested</h1>
        <p className="mt-2 text-slate-600">
          We&apos;re assigning a verified <strong>{service.tier}</strong> nurse for{" "}
          <strong>{service.name}</strong> at {address}, {CITY.name} on {date} at {time}.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Status: <span className="font-semibold text-amber-700">Requested → Assigning nurse</span>
        </p>
        {doctor && (
          <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Linked to your consultation with <strong>{doctor.name}</strong>. The nurse will help with
            intake, vitals and connecting you to the doctor.
          </p>
        )}
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700"
        >
          Book another visit
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-3xl bg-gradient-to-b from-brand-50 to-white p-6 md:p-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
          🏠 Home Nursing in {CITY.name}
        </span>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">Book a verified nurse to your home</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Vitals, dressing, injections, elderly care, or a nurse to assist your online doctor
          consultation. All nurses are background-verified and qualification-tiered.
        </p>
        {doctor && (
          <p className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm shadow-sm">
            Adding nursing support for your consultation with <strong>{doctor.name}</strong> ({doctor.specialty})
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Service selection */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold">1. Choose a service</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {NURSING_SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                  serviceId === s.id
                    ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                    : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="text-sm font-semibold text-brand-700">₹{s.price}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{s.description}</p>
                  <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {s.tier}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Booking form */}
          <h2 className="mt-8 font-semibold">2. Visit details</h2>
          <div className="mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Home address (in {CITY.name})
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House / flat, area, landmark"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Preferred date
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Preferred time
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </label>
          </div>
        </div>

        {/* Summary / tiers */}
        <aside>
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Booking summary</h3>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="font-medium">{service ? service.name : "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Nurse tier</span><span className="font-medium">{service ? service.tier : "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">City</span><span className="font-medium">{CITY.name}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base"><span>Total</span><span className="font-bold text-brand-700">{service ? `₹${service.price}` : "—"}</span></div>
              </div>
              <button
                disabled={!canSubmit}
                onClick={() => setSubmitted(true)}
                className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Confirm Nursing Visit
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                You consent to share your address with the assigned verified nurse only.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Nurse qualification tiers</h3>
              <ul className="mt-2 space-y-2 text-xs text-slate-600">
                {NURSE_TIERS.map((t) => (
                  <li key={t.tier}>
                    <span className="font-semibold text-slate-800">{t.tier}:</span> {t.scope}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
