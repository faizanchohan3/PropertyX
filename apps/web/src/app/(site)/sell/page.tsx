import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ShieldCheck, Sparkles, LineChart, MessageSquare, CalendarDays, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Sell or rent out your property", description: "List your property on Bismillah for free. AI-written descriptions, verified badges, lead management and visit scheduling.", alternates: { canonical: "/sell" } };

const STEPS = [
  { icon: Sparkles, title: "Describe it in minutes", body: "An 11-step wizard with AI Assist that turns your details into a clear title and description — without inventing anything." },
  { icon: Camera, title: "Add photos and video", body: "Upload up to 30 photos, floor plans, a video walkthrough or a 360° tour. Location data is stripped from photos for your privacy." },
  { icon: ShieldCheck, title: "Get verified", body: "Verify your phone and submit documents privately to earn a badge buyers trust." },
  { icon: MessageSquare, title: "Manage enquiries", body: "Calls, WhatsApp clicks, messages and offers in one inbox, with an intent score for every lead." },
  { icon: CalendarDays, title: "Schedule visits", body: "Accept or decline visit requests and sync them to your calendar." },
  { icon: LineChart, title: "Track performance", body: "See views, saves and enquiries for every listing, day by day." },
];

export default function SellPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-900 to-night text-white">
        <div className="container-px grid items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">Sell or rent out your property — faster, and to serious buyers.</h1>
            <p className="mt-4 text-lg text-brand-100/80">Free for owners. Agents and agencies can upgrade for more listings, featured placement and a full CRM.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/post-property" className="btn-gold px-6 py-3 text-base">
                <Plus className="h-5 w-5" /> Post your property
              </Link>
              <Link href="/tools/property-value" className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10">
                What's my property worth?
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["5 levels", "of verification"],
              ["11 steps", "guided listing wizard"],
              ["AI", "copywriting & lead scoring"],
              ["0 PKR", "for owners (up to 5 listings)"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <p className="text-3xl font-extrabold text-gold-300">{a}</p>
                <p className="text-sm text-brand-100/80">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-px py-16">
        <h2 className="section-title text-center">Everything you need to close the deal</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <s.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/pricing" className="font-semibold text-brand-700">
            Compare plans for agents, agencies and developers →
          </Link>
        </div>
      </section>
    </>
  );
}
