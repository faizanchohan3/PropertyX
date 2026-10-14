"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  calculateFinancing,
  formatPKR,
  formatPKRFull,
  FINANCING_MAX_PROFIT_PCT,
  type FinancingProduct,
  COUNTRY,
  isUAE,
  uaeMaxLtv,
  uaeBuyingCosts,
  UAE_EMIRATE_LABELS,
  type UaeEmirate,
  type UaeResidency,
} from "@propertyx/shared";
import { ToolLeadForm } from "./tool-lead-form";

export function HomeLoanCalculator({ products, initialPrice }: { products: FinancingProduct[]; initialPrice?: number }) {
  const [productKey, setProductKey] = useState(products[0].key);
  const product = products.find((p) => p.key === productKey) ?? products[0];
  const [price, setPrice] = useState(String(initialPrice || (isUAE ? 2_000_000 : 20_000_000)));
  const [downPct, setDownPct] = useState(isUAE ? 20 : 30);
  const [rate, setRate] = useState(String(product.defaultRate));
  const [tenure, setTenure] = useState(Math.min(isUAE ? 25 : 15, product.maxTenureYears));
  // UAE buyer profile — decides the Central Bank loan-to-value limit
  const [residency, setResidency] = useState<UaeResidency>("expat");
  const [firstHome, setFirstHome] = useState(true);
  const [offPlan, setOffPlan] = useState(false);
  const [emirate, setEmirate] = useState<UaeEmirate>("dubai");

  const propertyPriceNum = Math.max(0, Number(price) || 0);
  const maxLtv = isUAE ? uaeMaxLtv({ residency, firstHome, price: propertyPriceNum, offPlan }) : product.maxFinancingPct;
  const minDown = 100 - maxLtv;
  const pickProduct = (p: FinancingProduct) => {
    setProductKey(p.key);
    setRate(String(p.defaultRate));
    setTenure((t) => Math.min(t, p.maxTenureYears));
    setDownPct((d) => Math.max(d, 100 - p.maxFinancingPct));
  };

  const propertyPrice = propertyPriceNum;
  const effDownPct = Math.max(downPct, minDown);
  const downPayment = Math.round((propertyPrice * effDownPct) / 100);
  const annualRate = Math.max(0, Number(rate) || 0);
  const result = useMemo(
    () => (propertyPrice > 0 ? calculateFinancing({ propertyPrice, downPayment, annualRate, tenureYears: tenure, mode: product.mode }) : null),
    [propertyPrice, downPayment, annualRate, tenure, product.mode],
  );
  const principalShare = result && result.totalRepayment ? result.financedAmount / result.totalRepayment : 0;
  const costs = isUAE && result ? uaeBuyingCosts({ price: propertyPrice, emirate, purchase: offPlan ? "off_plan" : "resale", loanAmount: result.financedAmount }) : null;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="card space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <p className="label">Financing type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <button key={p.key} type="button" onClick={() => pickProduct(p)} className={`rounded-xl border p-3 text-left transition ${p.key === product.key ? "border-brand-700 bg-brand-50" : "border-slate-300 hover:border-slate-400"}`}>
                <span className="block text-sm font-semibold text-slate-900">{p.name}</span>
                <span className="block text-xs text-slate-500">
                  From {p.defaultRate}% · up to {p.maxTenureYears} yrs
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{product.description}</p>
        </div>
        {isUAE && (
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <p className="label">You are</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["expat", "national"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setResidency(r)} className={`chip justify-center text-xs ${residency === r ? "chip-active" : ""}`}>
                    {r === "expat" ? "Expat / resident" : "UAE national"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">This will be your</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[true, false].map((f) => (
                  <button key={String(f)} type="button" onClick={() => setFirstHome(f)} className={`chip justify-center text-xs ${firstHome === f ? "chip-active" : ""}`}>
                    {f ? "First home" : "Second+ home"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Property</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[false, true].map((o) => (
                  <button key={String(o)} type="button" onClick={() => setOffPlan(o)} className={`chip justify-center text-xs ${offPlan === o ? "chip-active" : ""}`}>
                    {o ? "Off-plan" : "Ready"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="hl-emirate">Emirate</label>
              <select id="hl-emirate" className="input py-2" value={emirate} onChange={(e) => setEmirate(e.target.value as UaeEmirate)}>
                {Object.entries(UAE_EMIRATE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div>
          <label className="label" htmlFor="hl-price">Property price ({COUNTRY.currency})</label>
          <input id="hl-price" className="input" type="number" min={0} step={isUAE ? 10000 : 100000} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          {propertyPrice > 0 && <p className="mt-1 text-xs text-slate-500">{formatPKR(propertyPrice)}</p>}
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="hl-down">Down payment</label>
            <span className="text-sm font-semibold text-slate-800">
              {effDownPct}% · {formatPKR(downPayment)}
            </span>
          </div>
          <input id="hl-down" className="w-full accent-brand-700" type="range" min={minDown} max={90} step={1} value={effDownPct} onChange={(e) => setDownPct(Number(e.target.value))} />
          <p className="text-xs text-slate-500">
            Minimum {minDown}% — banks finance up to {maxLtv}% of the price{isUAE ? " for this buyer profile (UAE Central Bank limit)" : ""}.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="hl-rate">{product.mode === "conventional" ? "Interest rate" : "Profit rate"} (% per year)</label>
            <input id="hl-rate" className="input" type="number" min={0} max={40} step={0.1} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="hl-tenure">Tenure</label>
              <span className="text-sm font-semibold text-slate-800">{tenure} years</span>
            </div>
            <input id="hl-tenure" className="mt-2 w-full accent-brand-700" type="range" min={1} max={product.maxTenureYears} step={1} value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
          </div>
        </div>
      </form>

      <div className="card p-6 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        {result ? (
          <>
            <p className="text-sm font-medium text-slate-500">Monthly installment</p>
            <p className="mt-1 text-4xl font-extrabold text-brand-800">{formatPKRFull(result.monthlyPayment)}</p>
            <p className="mt-1 text-sm text-slate-500">
              for {tenure} years ({tenure * 12} installments)
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Financed amount", formatPKR(result.financedAmount)],
                ["Down payment", formatPKR(downPayment)],
                [`Total ${result.labels.profit.toLowerCase()}`, formatPKR(result.totalFinancingCost)],
                ["Total you pay", formatPKR(result.totalPaidIncludingDown)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">
              <span className="bg-brand-700" style={{ width: `${principalShare * 100}%` }} />
              <span className="bg-gold-500" style={{ width: `${(1 - principalShare) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-700" /> {result.labels.principal} {Math.round(principalShare * 100)}%</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold-500" /> {result.labels.profit} {Math.round((1 - principalShare) * 100)}%</span>
            </div>
            {costs && (
              <div className="mt-6 rounded-xl border border-slate-200 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Cash needed upfront</p>
                  <p className="text-lg font-extrabold text-slate-900">{formatPKR(downPayment + costs.total)}</p>
                </div>
                <p className="text-xs text-slate-500">
                  Down payment {formatPKR(downPayment)} + buying costs {formatPKR(costs.total)} ({costs.percentOfPrice}% of the price)
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {costs.items.map((c) => (
                    <li key={c.key} className="flex justify-between gap-3">
                      <span className="text-slate-600">{c.label}</span>
                      <span className="font-medium text-slate-800">{formatPKR(c.amount)}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/tools/buying-costs?price=${propertyPrice}`} className="mt-3 inline-block text-sm font-semibold text-brand-700">
                  Adjust buying costs →
                </Link>
              </div>
            )}
            <details className="mt-6 rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">Year-by-year schedule</summary>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-right text-sm">
                  <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left">Year</th>
                      <th className="px-4 py-2">{result.labels.principal}</th>
                      <th className="px-4 py-2">{result.labels.profit}</th>
                      <th className="px-4 py-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.yearly.map((y) => (
                      <tr key={y.year}>
                        <td className="px-4 py-2 text-left text-slate-500">{y.year}</td>
                        <td className="px-4 py-2">{formatPKR(y.principal)}</td>
                        <td className="px-4 py-2">{formatPKR(y.profit)}</td>
                        <td className="px-4 py-2 font-semibold text-slate-900">{formatPKR(y.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <ToolLeadForm
              tool="home_loan"
              context={{
                "Property price": formatPKR(propertyPrice),
                "Down payment": `${formatPKR(downPayment)} (${effDownPct}%)`,
                Loan: formatPKR(result.financedAmount),
                "Monthly payment": formatPKR(Math.round(result.monthlyPayment)),
                Product: product.name,
                Rate: `${annualRate}%`,
                Tenure: `${tenure} years`,
                ...(isUAE ? { Residency: residency === "national" ? "UAE national" : "Expat", "First home": firstHome ? "Yes" : "No", Purchase: offPlan ? "Off-plan" : "Ready", Emirate: emirate } : {}),
              }}
            />
            <p className="mt-5 text-xs text-slate-400">
              {isUAE
                ? "Estimate only. Banks also require life and property insurance, a maximum loan term of 25 years (ending by age 65 for most expats, 70 for nationals) and monthly debts below 50% of your income. Fees follow published land-department schedules and change from time to time."
                : `Total ${result.labels.profit.toLowerCase()} is capped at ${FINANCING_MAX_PROFIT_PCT}% of the property price. Estimate only. Actual rates, fees, insurance and eligibility depend on the bank and on KIBOR at the time you apply.`}
            </p>
          </>
        ) : (
          <p className="py-16 text-center text-slate-500">Enter a property price to see your installment.</p>
        )}
      </div>
    </div>
  );
}
