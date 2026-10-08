"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Pause, Play, CheckCircle2, Send, Trash2, Sparkles, BarChart3, ExternalLink } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { Modal } from "../modal";
import { CheckoutButton } from "../checkout-button";

type Gateway = { key: string; name: string; description: string; methods: string[] };

export function ListingActions({ id, slug, status, purpose, featuredCreditsLeft, gateways }: { id: string; slug: string; status: string; purpose: string; featuredCreditsLeft: number; gateways: Gateway[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setOpen(false);
    try {
      await fn();
      toast(msg);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const status_ = (s: string, msg: string) => run(() => api(`/api/v1/listings/${id}/status`, { method: "PATCH", body: { status: s } }), msg);
  const items: { label: string; icon: typeof Pencil; onClick?: () => void; href?: string; danger?: boolean; show: boolean }[] = [
    { label: "View listing", icon: ExternalLink, href: `/property/${slug}`, show: true },
    { label: "Analytics & leads", icon: BarChart3, href: `/dashboard/listings/${id}`, show: status !== "draft" },
    { label: "Edit", icon: Pencil, href: `/dashboard/listings/${id}/edit`, show: !["sold"].includes(status) },
    { label: "Submit for review", icon: Send, onClick: () => status_("pending_review", "Submitted for review"), show: ["draft", "rejected"].includes(status) },
    { label: "Renew", icon: Play, onClick: () => status_("active", "Listing renewed"), show: status === "expired" },
    { label: "Pause", icon: Pause, onClick: () => status_("paused", "Listing paused"), show: status === "active" },
    { label: "Activate", icon: Play, onClick: () => status_("active", "Listing is active again"), show: status === "paused" },
    { label: purpose === "rent" ? "Mark as rented" : "Mark as sold", icon: CheckCircle2, onClick: () => status_(purpose === "rent" ? "rented" : "sold", "Congratulations on closing the deal!"), show: ["active", "paused"].includes(status) },
    { label: "Feature this listing", icon: Sparkles, onClick: () => setFeature(true), show: status === "active" },
    { label: "Delete", icon: Trash2, danger: true, onClick: () => confirm("Delete this listing permanently?") && run(() => api(`/api/v1/listings/${id}`, { method: "DELETE" }), "Listing deleted"), show: ["draft", "rejected", "expired"].includes(status) },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={busy} className="btn-outline btn-sm px-2" aria-label="Listing actions">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-[var(--shadow-lift)]">
            {items
              .filter((i) => i.show)
              .map((i) =>
                i.href ? (
                  <Link key={i.label} href={i.href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                    <i.icon className="h-4 w-4 text-slate-500" /> {i.label}
                  </Link>
                ) : (
                  <button key={i.label} onClick={i.onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${i.danger ? "text-red-600" : ""}`}>
                    <i.icon className="h-4 w-4" /> {i.label}
                  </button>
                ),
              )}
          </div>
        </>
      )}
      <Modal open={feature} onClose={() => setFeature(false)} title="Feature this listing">
        <p className="mb-4 text-sm text-slate-600">Featured listings appear at the top of search results and on the homepage with a gold badge.</p>
        {featuredCreditsLeft > 0 && (
          <button onClick={() => run(() => api(`/api/v1/listings/${id}/feature`, { method: "POST" }), "Featured for 7 days using a plan credit").then(() => setFeature(false))} className="btn-primary mb-3 w-full">
            <Sparkles className="h-4 w-4" /> Use a plan credit (7 days) — {featuredCreditsLeft} left
          </button>
        )}
        <div className="space-y-2">
          {[
            ["7", "7 days — Rs 1,500"],
            ["15", "15 days — Rs 2,500"],
            ["30", "30 days — Rs 4,500"],
          ].map(([days, label]) => (
            <CheckoutButton key={days} purpose="featured_listing" referenceId={id} option={days} label={label} className="btn-outline w-full" gateways={gateways} />
          ))}
        </div>
      </Modal>
    </div>
  );
}
