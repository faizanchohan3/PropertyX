"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { BellPlus, Check } from "lucide-react";
import { SORT_OPTIONS, type SearchQuery } from "@propertyx/shared";
import { api, ApiError } from "@/lib/client";
import { toast } from "../toast";

export function SortSelect({ value }: { value?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Sort results"
      className="input w-auto py-2"
      value={value ?? "recommended"}
      onChange={(e) => {
        const p = new URLSearchParams(params.toString());
        if (e.target.value === "recommended") p.delete("sort");
        else p.set("sort", e.target.value);
        p.delete("page");
        router.push(`${path}?${p.toString()}`);
      }}
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SaveSearchButton({ query, defaultName }: { query: SearchQuery; defaultName: string }) {
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [frequency, setFrequency] = useState("instant");
  const router = useRouter();
  const save = async () => {
    try {
      await api("/api/v1/saved-searches", { body: { name, query, frequency } });
      setDone(true);
      setOpen(false);
      toast("Search saved. We'll notify you about new matches.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      else toast((e as Error).message, "error");
    }
  };
  if (done)
    return (
      <span className="btn-outline pointer-events-none text-brand-700">
        <Check className="h-4 w-4" /> Saved
      </span>
    );
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-outline">
        <BellPlus className="h-4 w-4" /> Save search
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-lift)]">
          <label className="label" htmlFor="ss-name">Name</label>
          <input id="ss-name" className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <label className="label mt-3" htmlFor="ss-freq">Alert me</label>
          <select id="ss-freq" className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="instant">Instantly</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </select>
          <button onClick={save} className="btn-primary mt-4 w-full">
            Save & get alerts
          </button>
        </div>
      )}
    </div>
  );
}
