"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Scale, X } from "lucide-react";
import { toast } from "./toast";

const KEY = "px_compare";
type Item = { id: string; title: string };
const listeners = new Set<() => void>();
let cache: Item[] | null = null;

function read(): Item[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function write(items: Item[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: Item[] = [];

export function useCompare() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    has: (id: string) => items.some((i) => i.id === id),
    toggle: (it: Item) => {
      if (items.some((i) => i.id === it.id)) write(items.filter((i) => i.id !== it.id));
      else if (items.length >= 4) toast("You can compare up to 4 properties", "error");
      else write([...items, it]);
    },
    clear: () => write([]),
    remove: (id: string) => write(items.filter((i) => i.id !== id)),
  };
}

export function CompareToggle({ id, title }: { id: string; title: string }) {
  const c = useCompare();
  const on = c.has(id);
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800">
      <input type="checkbox" checked={on} onChange={() => c.toggle({ id, title })} className="h-3.5 w-3.5 accent-brand-700" />
      Compare
    </label>
  );
}

export function CompareTray() {
  const c = useCompare();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || c.items.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-16 z-50 px-4 md:bottom-4">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-2xl">
        <Scale className="h-5 w-5 text-gold-400" />
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {c.items.map((i) => (
            <span key={i.id} className="flex max-w-[180px] items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs">
              <span className="truncate">{i.title}</span>
              <button onClick={() => c.remove(i.id)} aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <button onClick={c.clear} className="text-xs text-slate-300 hover:text-white">
          Clear
        </button>
        <Link href={`/compare?ids=${c.items.map((i) => i.id).join(",")}`} className={`btn-gold btn-sm ${c.items.length < 2 ? "pointer-events-none opacity-50" : ""}`}>
          Compare {c.items.length}
        </Link>
      </div>
    </div>
  );
}
