"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateFinancing, formatPKR, formatPriceWords } from "@propertyx/shared";
import { anonId } from "@/lib/client";

export function ViewTracker({ listingId, projectId }: { listingId?: string; projectId?: string }) {
  useEffect(() => {
    const url = listingId ? `/api/v1/listings/${listingId}/events` : `/api/v1/projects/${projectId}/events`;
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "view", anonId: anonId() }) }).catch(() => {});
  }, [listingId, projectId]);
  return null;
}

export function FinanceWidget({ price }: { price: number }) {
  const [downPct, setDownPct] = useState(30);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(14);
  const [mode, setMode] = useState<"conventional" | "diminishing_musharakah">("conventional");
  const r = useMemo(() => calculateFinancing({ propertyPrice: price, downPayment: (price * downPct) / 100, annualRate: rate, tenureYears: years, mode }), [price, downPct, rate, years, mode]);
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["conventional", "diminishing_musharakah"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`chip justify-center text-xs ${mode === m ? "chip-active" : ""}`}>
            {m === "conventional" ? "Conventional" : "Islamic (DM)"}
          </button>
        ))}
      </div>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="flex justify-between text-slate-600">
            Down payment <b className="text-slate-900">{downPct}% · {formatPriceWords((price * downPct) / 100)}</b>
          </span>
          <input type="range" min={15} max={90} step={5} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className="w-full accent-brand-700" />
        </label>
        <label className="block">
          <span className="flex justify-between text-slate-600">
            Tenure <b className="text-slate-900">{years} years</b>
          </span>
          <input type="range" min={3} max={25} value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full accent-brand-700" />
        </label>
        <label className="block">
          <span className="flex justify-between text-slate-600">
            {mode === "conventional" ? "Interest" : "Profit"} rate <b className="text-slate-900">{rate}%</b>
          </span>
          <input type="range" min={6} max={24} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-brand-700" />
        </label>
      </div>
      <div className="mt-4 rounded-xl bg-brand-50 p-4 text-center">
        <p className="text-xs text-brand-800">Estimated monthly payment</p>
        <p className="text-2xl font-extrabold text-brand-900">{formatPKR(r.monthlyPayment)}</p>
        <p className="mt-1 text-xs text-brand-800/70">Total financing cost {formatPKR(r.totalFinancingCost)}</p>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Estimate only — not an offer of finance. Rates vary by bank.</p>
      <Link href={`/tools/home-loan?price=${price}`} className="mt-2 block text-center text-sm font-semibold text-brand-700">
        Full financing calculator →
      </Link>
    </div>
  );
}

export function PriceHistoryChart({ points }: { points: { at: string; price: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-slate-500">No price changes since this listing was published.</p>;
  const w = 600;
  const h = 140;
  const prices = points.map((p) => p.price);
  const min = Math.min(...prices) * 0.97;
  const max = Math.max(...prices) * 1.03;
  const t0 = new Date(points[0].at).getTime();
  const t1 = Math.max(Date.now(), new Date(points[points.length - 1].at).getTime());
  const x = (t: string) => ((new Date(t).getTime() - t0) / (t1 - t0 || 1)) * (w - 40) + 20;
  const y = (p: number) => h - 20 - ((p - min) / (max - min || 1)) * (h - 40);
  let d = "";
  points.forEach((p, i) => {
    d += i === 0 ? `M${x(p.at)},${y(p.price)}` : ` H${x(p.at)} V${y(p.price)}`;
  });
  d += ` H${w - 20}`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label="Price history">
        <path d={d} fill="none" stroke="#047857" strokeWidth="2.5" />
        {points.map((p) => (
          <circle key={p.at} cx={x(p.at)} cy={y(p.price)} r="4" fill="#fff" stroke="#047857" strokeWidth="2" />
        ))}
      </svg>
      <ul className="mt-2 space-y-1 text-sm">
        {points.map((p, i) => (
          <li key={p.at} className="flex justify-between">
            <span className="text-slate-500">{new Date(p.at).toLocaleDateString("en-PK", { dateStyle: "medium" })}</span>
            <span className="font-semibold">
              {formatPKR(p.price)}
              {i > 0 && <span className={`ml-2 text-xs ${p.price < points[i - 1].price ? "text-red-600" : "text-emerald-600"}`}>{p.price < points[i - 1].price ? "▼" : "▲"} {formatPriceWords(Math.abs(p.price - points[i - 1].price))}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReadMore({ text, lines = 6 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 600;
  return (
    <div>
      <div className={`whitespace-pre-line leading-relaxed text-slate-700 ${!open && long ? "line-clamp-[var(--l)]" : ""}`} style={{ ["--l" as string]: lines }}>
        {text}
      </div>
      {long && (
        <button onClick={() => setOpen((o) => !o)} className="mt-2 text-sm font-semibold text-brand-700">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
