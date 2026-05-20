"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { value: "relevance", label: "Most relevant" },
  { value: "rating", label: "Highest rated" },
  { value: "fee_low", label: "Fee: low to high" },
  { value: "fee_high", label: "Fee: high to low" },
  { value: "experience", label: "Most experienced" }
];

export default function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();
  const value = params.get("sort") ?? "relevance";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    if (e.target.value === "relevance") next.delete("sort");
    else next.set("sort", e.target.value);
    next.delete("page");
    router.push(`/doctors?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Sort:</span>
      <select value={value} onChange={onChange} className="input w-auto py-2">
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
