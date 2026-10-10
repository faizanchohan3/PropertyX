"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { AREA_UNITS, AREA_UNIT_LABELS, DEFAULT_MARLA_SQFT, fromSqft, toSqft, type AreaUnit } from "@propertyx/shared";

const MARLA_SIZES = [
  { sqft: DEFAULT_MARLA_SQFT, label: "225 sq ft", hint: "DHA, Bahria and most housing societies" },
  { sqft: 272.25, label: "272.25 sq ft", hint: "Revenue records (patwari / old city)" },
];

const fmt = (n: number) => (n === 0 ? "0" : Math.abs(n) >= 1 ? n.toLocaleString("en-PK", { maximumFractionDigits: 2 }) : n.toLocaleString("en-PK", { maximumSignificantDigits: 4 }));

export function AreaConverter() {
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState<AreaUnit>("kanal");
  const [to, setTo] = useState<AreaUnit>("marla");
  const [marla, setMarla] = useState(DEFAULT_MARLA_SQFT);

  const n = Number(value);
  const sqft = Number.isFinite(n) && n >= 0 ? toSqft(n, from, marla) : 0;
  const result = fromSqft(sqft, to, marla);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="card space-y-5 p-6">
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div>
            <label className="label" htmlFor="ac-value">Value</label>
            <div className="flex gap-2">
              <input id="ac-value" className="input" type="number" min={0} step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
              <select className="input w-28 shrink-0" value={from} onChange={(e) => setFrom(e.target.value as AreaUnit)} aria-label="From unit">
                {AREA_UNITS.map((u) => (
                  <option key={u} value={u}>{AREA_UNIT_LABELS[u]}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="button" className="btn-ghost mb-0.5 justify-self-center px-2.5" onClick={() => { setFrom(to); setTo(from); setValue(String(Number(result.toFixed(4)))); }} aria-label="Swap units" title="Swap units">
            <ArrowLeftRight className="h-5 w-5" />
          </button>
          <div>
            <label className="label" htmlFor="ac-to">Convert to</label>
            <select id="ac-to" className="input" value={to} onChange={(e) => setTo(e.target.value as AreaUnit)}>
              {AREA_UNITS.map((u) => (
                <option key={u} value={u}>{AREA_UNIT_LABELS[u]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="rounded-2xl bg-brand-50 p-5 text-center" aria-live="polite">
          <p className="text-sm text-brand-800">
            {fmt(n || 0)} {AREA_UNIT_LABELS[from]} =
          </p>
          <p className="mt-1 text-3xl font-extrabold text-brand-800">
            {fmt(result)} {AREA_UNIT_LABELS[to]}
          </p>
        </div>
        <div>
          <p className="label">Marla size</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MARLA_SIZES.map((m) => (
              <button key={m.sqft} type="button" onClick={() => setMarla(m.sqft)} className={`rounded-xl border p-3 text-left transition ${marla === m.sqft ? "border-brand-700 bg-brand-50" : "border-slate-300 hover:border-slate-400"}`}>
                <span className="block text-sm font-semibold text-slate-900">1 marla = {m.label}</span>
                <span className="block text-xs text-slate-500">{m.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">1 kanal = 20 marla. Check which marla size your society or land record uses.</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="px-6 pt-6 text-lg font-bold">
          {fmt(n || 0)} {AREA_UNIT_LABELS[from]} in every unit
        </h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {AREA_UNITS.map((u) => (
            <li key={u} className={`flex justify-between px-6 py-3 text-sm ${u === from ? "bg-slate-50" : ""}`}>
              <span className="text-slate-600">{AREA_UNIT_LABELS[u]}</span>
              <span className="font-semibold text-slate-900">{fmt(fromSqft(sqft, u, marla))}</span>
            </li>
          ))}
        </ul>
        <p className="px-6 py-4 text-xs text-slate-400">Common sizes: 5 marla = {fmt(toSqft(5, "marla", marla))} sq ft · 10 marla = {fmt(toSqft(10, "marla", marla))} sq ft · 1 kanal = {fmt(toSqft(1, "kanal", marla))} sq ft</p>
      </div>
    </div>
  );
}
