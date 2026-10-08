"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

export type Suggestion = { slug: string; name: string; fullName: string; kind: string; citySlug: string | null; activeListings: number };

export function LocationAutocomplete({
  value,
  onSelect,
  city,
  placeholder = "Area, society or block",
  className = "",
  inputClassName = "input",
}: {
  value: { slug: string; label: string } | null;
  onSelect: (s: Suggestion | null) => void;
  city?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [term, setTerm] = useState(value?.label ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setTerm(value?.label ?? ""), [value?.label]);
  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/locations/suggest?q=${encodeURIComponent(term)}${city ? `&city=${city}` : ""}`, { signal: ctl.signal });
        const d = await r.json();
        setItems(d.items ?? []);
        setHi(0);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [term, open, city]);
  useEffect(() => {
    const h = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const choose = (s: Suggestion) => {
    setTerm(s.name);
    setOpen(false);
    onSelect(s);
  };

  return (
    <div ref={box} className={`relative ${className}`}>
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          if (!e.target.value) onSelect(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => Math.min(items.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(items[hi]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className={inputClassName}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      {open && items.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[var(--shadow-lift)]">
          {items.map((s, i) => (
            <li key={s.slug} role="option" aria-selected={i === hi}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(s)} onMouseEnter={() => setHi(i)} className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left ${i === hi ? "bg-brand-50" : ""}`}>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{s.name}</span>
                  <span className="block truncate text-xs text-slate-500">{s.fullName}</span>
                </span>
                <span className="shrink-0 text-[11px] text-slate-400">{s.activeListings > 0 ? `${s.activeListings}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
