"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles, ArrowUp, Loader2, MapPin, BedDouble, Maximize, Wallet, RotateCcw, ExternalLink, Info } from "lucide-react";
import { formatPKR, formatArea } from "@propertyx/shared";
import { api } from "@/lib/client";

type Ranked = { listing: { id: string; slug: string; title: string; price: number; purpose: string; coverUrl: string | null; locationFullName: string | null; beds: number | null; areaValue: number; areaUnit: "marla"; verificationLevel: number; isSeed: boolean }; score: number; reasons: string[]; caveats: string[] };
type Resp = {
  reply: string;
  criteria: Record<string, unknown>;
  summary: string;
  total: number;
  results: Ranked[];
  alternatives: { label: string; results: Ranked[]; total: number } | null;
  affordability: { budget: number; downPayment: number; monthlyPayment: number; tenureYears: number; rate: number; suggestedMonthlyIncome: number; note: string } | null;
  recommendedLocations: { slug: string; name: string; medianPrice: number; listings: number }[];
  followUps: string[];
  suggestions: string[];
  provider: string;
  searchUrl: string;
  sessionId?: string;
};
type Msg = { role: "user"; text: string } | { role: "assistant"; data: Resp };

function ResultCard({ r }: { r: Ranked }) {
  const l = r.listing;
  return (
    <Link href={`/property/${l.slug}`} target="_blank" className="card flex gap-3 p-3 transition hover:border-brand-300">
      {l.coverUrl && <img src={l.coverUrl.replace(/w=\d+/, "w=300")} alt="" className="h-24 w-28 shrink-0 rounded-xl object-cover" loading="lazy" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-slate-900">
            {formatPKR(l.price)}
            {l.purpose === "rent" ? "/mo" : ""}
          </p>
          <span className="badge shrink-0 bg-brand-50 text-brand-800" title="Match score">
            {r.score}% match
          </span>
        </div>
        <p className="line-clamp-1 text-sm font-medium text-slate-700">{l.title}</p>
        <p className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3" />
            {l.locationFullName}
          </span>
          {l.beds != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="h-3 w-3" />
              {l.beds}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Maximize className="h-3 w-3" />
            {formatArea(l.areaValue, l.areaUnit)}
          </span>
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {r.reasons.slice(0, 4).map((x) => (
            <li key={x} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">
              ✓ {x}
            </li>
          ))}
          {r.caveats.map((x) => (
            <li key={x} className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800">
              ! {x}
            </li>
          ))}
        </ul>
      </div>
    </Link>
  );
}

export function AssistantChat() {
  const sp = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [criteria, setCriteria] = useState<Record<string, unknown>>({});
  const [lastPrices, setLastPrices] = useState<number[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const end = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setBusy(true);
    try {
      const r = await api<Resp>("/api/v1/ai/assistant", { body: { message: t, criteria, lastResultPrices: lastPrices, sessionId } });
      setCriteria(r.criteria);
      setLastPrices(r.results.map((x) => x.listing.price));
      setSessionId(r.sessionId);
      setMsgs((m) => [...m, { role: "assistant", data: r }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "assistant", data: { reply: (e as Error).message, criteria, summary: "", total: 0, results: [], alternatives: null, affordability: null, recommendedLocations: [], followUps: [], suggestions: [], provider: "", searchUrl: "/search" } }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const q = sp.get("q");
    if (q && !started.current) {
      started.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs, busy]);

  const reset = () => {
    setMsgs([]);
    setCriteria({});
    setLastPrices([]);
    setSessionId(undefined);
  };
  const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant") as { role: "assistant"; data: Resp } | undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col">
      <div className="min-h-[50vh] space-y-6 pb-40">
        {msgs.length === 0 && (
          <div className="py-10 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 text-white shadow-lg">
              <Sparkles className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-3xl font-extrabold">AI Property Assistant</h1>
            <p className="mx-auto mt-2 max-w-xl text-slate-500">Describe what you're looking for in plain words — budget in lakh or crore, size in marla or kanal, area, bedrooms. I'll search live listings and explain every match.</p>
            <div className="mx-auto mt-6 grid max-w-2xl gap-2 sm:grid-cols-2">
              {["I have 2 crore budget and want a 10 marla house in Lahore", "5 marla house near DHA Lahore under 1.5 crore", "2 bed apartment for rent in E-11 Islamabad under 1.5 lakh", "Residential plot on installments in Multan", "Office for rent in Blue Area Islamabad", "Farmhouse near Bedian Road Lahore"].map((e) => (
                <button key={e} onClick={() => send(e)} className="card px-4 py-3 text-left text-sm text-slate-700 hover:border-brand-300">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-700 px-4 py-2.5 text-white">{m.text}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-900 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-4">
                <p className="leading-relaxed text-slate-800">{m.data.reply}</p>
                {m.data.results.length > 0 && (
                  <div className="space-y-2">
                    {m.data.results.slice(0, 6).map((r) => (
                      <ResultCard key={r.listing.id} r={r} />
                    ))}
                    {m.data.total > 6 && (
                      <Link href={m.data.searchUrl} className="btn-outline btn-sm">
                        See all {m.data.total} results <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )}
                {m.data.alternatives && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="mb-2 text-sm font-semibold text-slate-800">Alternatives — {m.data.alternatives.label}</p>
                    <div className="space-y-2">
                      {m.data.alternatives.results.slice(0, 3).map((r) => (
                        <ResultCard key={r.listing.id} r={r} />
                      ))}
                    </div>
                  </div>
                )}
                {m.data.affordability && (
                  <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-gold-900">
                      <Wallet className="h-4 w-4" /> Affordability check
                    </p>
                    <p className="mt-1 text-gold-900">
                      For {formatPKR(m.data.affordability.budget)}: about <b>{formatPKR(m.data.affordability.monthlyPayment)}/month</b> over {m.data.affordability.tenureYears} years with {formatPKR(m.data.affordability.downPayment)} down at {m.data.affordability.rate}%. A monthly household income of roughly {formatPKR(m.data.affordability.suggestedMonthlyIncome)} keeps the installment near 40% of income.
                    </p>
                    <p className="mt-1 text-xs text-gold-800">{m.data.affordability.note}</p>
                  </div>
                )}
                {m.data.recommendedLocations.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">Areas where this budget fits (median asking price)</p>
                    <div className="flex flex-wrap gap-2">
                      {m.data.recommendedLocations.map((l) => (
                        <button key={l.slug} onClick={() => send(`Show options in ${l.name}`)} className="chip text-xs">
                          {l.name} · {formatPKR(l.medianPrice)} <span className="text-slate-400">({l.listings})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {m.data.followUps.length > 0 && m.data.total === 0 && (
                  <ul className="list-disc pl-5 text-sm text-slate-600">
                    {m.data.followUps.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Searching live listings…
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0">
        <div className="mx-auto max-w-4xl">
          {lastAssistant && lastAssistant.data.suggestions.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto scrollbar-none">
              {(lastAssistant.data.followUps.length && lastAssistant.data.total > 20 ? lastAssistant.data.followUps : []).concat(lastAssistant.data.suggestions).map((s) => (
                <button key={s} onClick={() => send(s)} className="chip shrink-0 text-xs">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            {msgs.length > 0 && (
              <button type="button" onClick={reset} className="btn-ghost px-2.5" title="Start over" aria-label="Start over">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Show cheaper options · Only corner houses · 3 beds in Bahria Town" className="input py-3" maxLength={500} aria-label="Message the assistant" />
            <button className="btn-primary h-11 w-11 p-0" disabled={busy || !input.trim()} aria-label="Send">
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
            <Info className="h-3 w-3" /> Results come only from live PropertyX listings. Prices and affordability figures are estimates, not financial advice.
            {lastAssistant?.data.provider && <span className="ml-auto">engine: {lastAssistant.data.provider}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
