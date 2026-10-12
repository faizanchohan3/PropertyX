"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatPKR, formatPKRFull, uaeBuyingCosts, uaeMaxLtv, UAE_EMIRATE_LABELS, type UaeEmirate, type UaePurchase } from "@propertyx/shared";

/** UAE one-off buying costs: land department fees, trustee, mortgage registration, agent and bank fees. */
export function BuyingCostsCalculator({ initialPrice }: { initialPrice?: number }) {
  const [price, setPrice] = useState(String(initialPrice || 2_000_000));
  const [emirate, setEmirate] = useState<UaeEmirate>("dubai");
  const [purchase, setPurchase] = useState<UaePurchase>("resale");
  const [mortgage, setMortgage] = useState(true);
  const [loanPct, setLoanPct] = useState(80);
  const [commission, setCommission] = useState("2");
  const [bankFee, setBankFee] = useState("1");

  const p = Math.max(0, Number(price) || 0);
  const maxLtv = uaeMaxLtv({ residency: "national", firstHome: true, price: p, offPlan: purchase === "off_plan" });
  const ltv = Math.min(loanPct, maxLtv);
  const loan = mortgage ? Math.round((p * ltv) / 100) : 0;
  const r = useMemo(
    () => uaeBuyingCosts({ price: p, emirate, purchase, loanAmount: loan, agentCommissionPct: Number(commission) || 0, bankFeePct: Number(bankFee) || 0 }),
    [p, emirate, purchase, loan, commission, bankFee],
  );
  const down = p - loan;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="card space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="bc-price">Property price (AED)</label>
          <input id="bc-price" className="input" type="number" min={0} step={10000} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          {p > 0 && <p className="mt-1 text-xs text-slate-500">{formatPKR(p)}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bc-emirate">Emirate</label>
            <select id="bc-emirate" className="input" value={emirate} onChange={(e) => setEmirate(e.target.value as UaeEmirate)}>
              {Object.entries(UAE_EMIRATE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="label">Buying</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["resale", "off_plan"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setPurchase(k);
                    setCommission(k === "resale" ? "2" : "0");
                  }}
                  className={`chip justify-center text-xs ${purchase === k ? "chip-active" : ""}`}
                >
                  {k === "resale" ? "Ready / resale" : "Off-plan"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="label">Paying with</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[true, false].map((m) => (
              <button key={String(m)} type="button" onClick={() => setMortgage(m)} className={`chip justify-center text-xs ${mortgage === m ? "chip-active" : ""}`}>
                {m ? "Mortgage" : "Cash"}
              </button>
            ))}
          </div>
        </div>
        {mortgage && (
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="bc-ltv">Loan</label>
              <span className="text-sm font-semibold text-slate-800">
                {ltv}% · {formatPKR(loan)}
              </span>
            </div>
            <input id="bc-ltv" className="w-full accent-brand-700" type="range" min={10} max={maxLtv} step={5} value={ltv} onChange={(e) => setLoanPct(Number(e.target.value))} />
            <p className="text-xs text-slate-500">Banks lend at most {maxLtv}% here; expats and second homes get less — see the mortgage calculator.</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bc-comm">Agent commission (%)</label>
            <input id="bc-comm" className="input" type="number" min={0} max={5} step={0.5} value={commission} onChange={(e) => setCommission(e.target.value)} />
          </div>
          {mortgage && (
            <div>
              <label className="label" htmlFor="bc-bank">Bank arrangement fee (%)</label>
              <input id="bc-bank" className="input" type="number" min={0} max={2} step={0.25} value={bankFee} onChange={(e) => setBankFee(e.target.value)} />
            </div>
          )}
        </div>
      </form>

      <div className="card p-6 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        <p className="text-sm font-medium text-slate-500">Total buying costs</p>
        <p className="mt-1 text-4xl font-extrabold text-brand-800">{formatPKRFull(r.total)}</p>
        <p className="mt-1 text-sm text-slate-500">{r.percentOfPrice}% of the price, on top of the down payment</p>
        <table className="mt-5 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {r.items.map((c) => (
              <tr key={c.key}>
                <td className="py-2 pe-3">
                  <span className="font-medium text-slate-800">{c.label}</span>
                  {c.note && <span className="block text-xs text-slate-500">{c.note}</span>}
                </td>
                <td className="py-2 text-end font-semibold text-slate-900">{formatPKR(c.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            [mortgage ? "Down payment" : "Price", formatPKR(down)],
            ["Cash needed on transfer day", formatPKR(down + r.total)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">{v}</p>
            </div>
          ))}
        </div>
        {mortgage && (
          <Link href={`/tools/home-loan?price=${p}`} className="mt-4 inline-block text-sm font-semibold text-brand-700">
            Monthly payment for this loan →
          </Link>
        )}
        <p className="mt-5 text-xs text-slate-400">
          Estimate based on the published Dubai Land Department, ADREC and Sharjah fee schedules. Off-plan purchases from a developer normally have no agent commission or trustee fee; some developers also cover part of the DLD fee. Confirm the exact amounts with your agent, bank and the land department before you transfer.
        </p>
      </div>
    </div>
  );
}
