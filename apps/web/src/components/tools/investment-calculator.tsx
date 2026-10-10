"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { analyseInvestment, formatPKR, type DevelopmentStatus } from "@propertyx/shared";

const STATUSES: { key: DevelopmentStatus; label: string }[] = [
  { key: "developed", label: "Developed" },
  { key: "developing", label: "Developing" },
  { key: "undeveloped", label: "Undeveloped" },
];
const GRADE_STYLE = { Excellent: "bg-emerald-600", Good: "bg-brand-700", Average: "bg-gold-500", Risky: "bg-red-600" } as const;

export function InvestmentCalculator() {
  const [price, setPrice] = useState("25000000");
  const [rent, setRent] = useState("90000");
  const [status, setStatus] = useState<DevelopmentStatus>("developed");
  const [years, setYears] = useState(5);
  const [appreciation, setAppreciation] = useState("10");
  const [financed, setFinanced] = useState(false);
  const [downPct, setDownPct] = useState(30);
  const [rate, setRate] = useState("14");
  const [tenure, setTenure] = useState(15);

  const purchasePrice = Math.max(0, Number(price) || 0);
  const r = useMemo(
    () =>
      purchasePrice > 0
        ? analyseInvestment({
            purchasePrice,
            monthlyRent: Math.max(0, Number(rent) || 0),
            developmentStatus: status,
            holdingYears: years,
            appreciationPct: Number(appreciation) || 0,
            financing: financed ? { downPaymentPct: downPct, annualRate: Number(rate) || 0, tenureYears: tenure } : null,
          })
        : null,
    [purchasePrice, rent, status, years, appreciation, financed, downPct, rate, tenure],
  );

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="card space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="iv-price">Purchase price (PKR)</label>
            <input id="iv-price" className="input" type="number" min={0} step={100000} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
            {purchasePrice > 0 && <p className="mt-1 text-xs text-slate-500">{formatPKR(purchasePrice)}</p>}
          </div>
          <div>
            <label className="label" htmlFor="iv-rent">Monthly rent (PKR)</label>
            <input id="iv-rent" className="input" type="number" min={0} step={5000} inputMode="numeric" value={rent} onChange={(e) => setRent(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">0 for a plot or an empty property</p>
          </div>
        </div>
        <div>
          <p className="label">Area status</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s.key} type="button" className={`chip ${status === s.key ? "chip-active" : ""}`} onClick={() => setStatus(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="iv-app">Expected price growth (% a year)</label>
            <input id="iv-app" className="input" type="number" min={-20} max={50} step={0.5} value={appreciation} onChange={(e) => setAppreciation(e.target.value)} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="iv-years">Holding period</label>
              <span className="text-sm font-semibold text-slate-800">{years} years</span>
            </div>
            <input id="iv-years" className="mt-2 w-full accent-brand-700" type="range" min={1} max={20} value={years} onChange={(e) => setYears(Number(e.target.value))} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={financed} onChange={(e) => setFinanced(e.target.checked)} /> Buying with a home loan
          </label>
          {financed && (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="iv-down">Down payment %</label>
                <input id="iv-down" className="input" type="number" min={10} max={90} value={downPct} onChange={(e) => setDownPct(Math.min(90, Math.max(10, Number(e.target.value) || 10)))} />
              </div>
              <div>
                <label className="label" htmlFor="iv-rate">Rate %</label>
                <input id="iv-rate" className="input" type="number" min={0} max={40} step={0.1} value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="iv-tenure">Years</label>
                <input id="iv-tenure" className="input" type="number" min={1} max={25} value={tenure} onChange={(e) => setTenure(Math.min(25, Math.max(1, Number(e.target.value) || 1)))} />
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">Assumes 8% vacancy, 10% of rent for maintenance, yearly taxes of 0.15% of price, 4% buying costs and 2% selling costs.</p>
      </form>

      <div className="card p-6 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        {r ? (
          <>
            <div className="flex items-center gap-4">
              <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold text-white ${GRADE_STYLE[r.grade]}`}>{r.score}</span>
              <div>
                <p className="text-sm font-medium text-slate-500">Investment score</p>
                <p className="text-2xl font-extrabold text-slate-900">{r.grade}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Gross yield", `${r.grossRentalYield.toFixed(1)}%`],
                ["Net yield", `${r.netRentalYield.toFixed(1)}%`],
                ["Yearly cash flow", formatPKR(r.annualCashFlow)],
                ["Cash invested", formatPKR(r.cashInvested)],
                [`Value in ${years} yrs`, formatPKR(r.futureValue)],
                ["Total profit", formatPKR(r.totalReturn)],
                ["ROI", `${r.roi.toFixed(0)}%`],
                ["Per year", `${r.annualisedReturn.toFixed(1)}%`],
                ["Break-even", r.breakEvenYears ? `${r.breakEvenYears} ${r.breakEvenYears === 1 ? "year" : "years"}` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-3">
              {r.factors.map((f) => {
                const Icon = f.impact === "positive" ? CheckCircle2 : f.impact === "negative" ? XCircle : MinusCircle;
                const color = f.impact === "positive" ? "text-emerald-600" : f.impact === "negative" ? "text-red-600" : "text-slate-400";
                return (
                  <li key={f.label} className="flex gap-3 text-sm">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                    <span>
                      <span className="font-semibold text-slate-800">{f.label}.</span> <span className="text-slate-600">{f.detail}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <details className="mt-6 rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Year by year</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Year</th>
                      <th className="px-4 py-2">Value</th>
                      <th className="px-4 py-2">Cash flow</th>
                      <th className="px-4 py-2">Profit if sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {r.yearly.map((y) => (
                      <tr key={y.year}>
                        <td className="px-4 py-2 text-left text-slate-500">{y.year}</td>
                        <td className="px-4 py-2">{formatPKR(y.propertyValue)}</td>
                        <td className="px-4 py-2">{formatPKR(y.cashFlow)}</td>
                        <td className={`px-4 py-2 font-semibold ${y.cumulativeProfit < 0 ? "text-red-600" : "text-slate-900"}`}>{formatPKR(y.cumulativeProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="mt-5 text-xs text-slate-400">Estimate only, based on your assumptions. It is not financial advice.</p>
          </>
        ) : (
          <p className="py-16 text-center text-slate-500">Enter a purchase price to see the analysis.</p>
        )}
      </div>
    </div>
  );
}
