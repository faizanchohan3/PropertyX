"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { calculateInstallmentPlan, formatPKR, formatPKRFull } from "@propertyx/shared";

const DURATIONS = [12, 24, 36, 48, 60];

export function InstallmentCalculator() {
  const [price, setPrice] = useState("10000000");
  const [downPct, setDownPct] = useState(20);
  const [months, setMonths] = useState(36);
  const [quarterly, setQuarterly] = useState("");
  const [balloon, setBalloon] = useState("");
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));

  const totalPrice = Math.max(0, Number(price) || 0);
  const downPayment = Math.round((totalPrice * downPct) / 100);
  const plan = useMemo(
    () => (totalPrice > 0 ? calculateInstallmentPlan({ totalPrice, downPayment, durationMonths: months, quarterlyInstallment: Number(quarterly) || 0, balloonPayment: Number(balloon) || 0, startDate: start }) : null),
    [totalPrice, downPayment, months, quarterly, balloon, start],
  );
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="card space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="ip-price">Total price (PKR)</label>
          <input id="ip-price" className="input" type="number" min={0} step={100000} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          {totalPrice > 0 && <p className="mt-1 text-xs text-slate-500">{formatPKR(totalPrice)}</p>}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="ip-down">Down payment</label>
            <span className="text-sm font-semibold text-slate-800">{downPct}% · {formatPKR(downPayment)}</span>
          </div>
          <input id="ip-down" className="w-full accent-brand-700" type="range" min={0} max={80} step={5} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} />
        </div>
        <div>
          <p className="label">Plan length</p>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <button key={d} type="button" className={`chip ${months === d ? "chip-active" : ""}`} onClick={() => setMonths(d)}>
                {d / 12} {d === 12 ? "year" : "years"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ip-q">Quarterly installment (optional)</label>
            <input id="ip-q" className="input" type="number" min={0} step={10000} placeholder="0" value={quarterly} onChange={(e) => setQuarterly(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ip-b">Possession payment (optional)</label>
            <input id="ip-b" className="input" type="number" min={0} step={100000} placeholder="0" value={balloon} onChange={(e) => setBalloon(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ip-start">Plan start date</label>
          <input id="ip-start" className="input" type="date" value={start} onChange={(e) => setStart(e.target.value || new Date().toISOString().slice(0, 10))} />
        </div>
        <p className="text-xs text-slate-500">The monthly installment is worked out so the plan pays off the full price, after any quarterly and possession payments.</p>
      </form>

      <div className="card p-6 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        {plan ? (
          <>
            <p className="text-sm font-medium text-slate-500">Monthly installment</p>
            <p className="mt-1 text-4xl font-extrabold text-brand-800">{formatPKRFull(plan.monthlyInstallment)}</p>
            <p className="mt-1 text-sm text-slate-500">for {months} months</p>
            {plan.warnings.map((w) => (
              <p key={w} className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {w}
              </p>
            ))}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Down payment", formatPKR(downPayment)],
                ["Quarterly", plan.quarterlyInstallment ? formatPKR(plan.quarterlyInstallment) : "—"],
                ["Possession", plan.balloonPayment ? formatPKR(plan.balloonPayment) : "—"],
                ["Total payable", formatPKR(plan.totalPayable)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
            <details className="mt-6 rounded-xl border border-slate-200" open>
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Payment schedule ({plan.schedule.length} payments)</summary>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2">Due</th>
                      <th className="px-4 py-2">Payment</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plan.schedule.map((r) => (
                      <tr key={r.index}>
                        <td className="whitespace-nowrap px-4 py-2 text-slate-500">{date(r.dueDate)}</td>
                        <td className="px-4 py-2">{r.label}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-semibold">{formatPKRFull(r.amount)}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-slate-500">{formatPKR(Math.max(0, r.remaining))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <p className="py-16 text-center text-slate-500">Enter a price to build the plan.</p>
        )}
      </div>
    </div>
  );
}
