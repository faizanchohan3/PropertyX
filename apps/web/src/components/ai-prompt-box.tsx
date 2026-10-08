"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowUp } from "lucide-react";

const EXAMPLES = ["5 marla house near DHA Lahore under 1.5 crore", "2 bed apartment for rent in E-11 Islamabad", "Plots on installments in Multan", "Shop for sale in Gulberg Lahore"];

export function AiPromptBox() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const go = (text: string) => text.trim() && router.push(`/ai?q=${encodeURIComponent(text.trim())}`);
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-xl"
      >
        <Sparkles className="ml-2 h-5 w-5 shrink-0 text-gold-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="I have 2 crore and want a 10 marla house in Lahore…" className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" aria-label="Describe the property you want" />
        <button type="submit" className="btn-primary h-10 w-10 p-0" aria-label="Ask">
          <ArrowUp className="h-5 w-5" />
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => go(e)} className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-brand-50 ring-1 ring-white/20 hover:bg-white/20">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
