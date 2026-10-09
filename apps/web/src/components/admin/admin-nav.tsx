"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Building2, Users, ShieldCheck, ShieldAlert, Flag, Star, HardHat, MapPinned, Newspaper, MessagesSquare, Megaphone, CreditCard, Settings, ScrollText, Briefcase, Menu, X, ArrowLeft, type LucideIcon } from "lucide-react";
import { Logo } from "../logo";

const ICONS: Record<string, LucideIcon> = { LayoutDashboard, Building2, Users, ShieldCheck, ShieldAlert, Flag, Star, HardHat, MapPinned, Newspaper, MessagesSquare, Megaphone, CreditCard, Settings, ScrollText, Briefcase };

export type AdminNavItem = { href: string; label: string; icon: string; count?: number; alert?: boolean };

export function AdminNav({ items, user }: { items: AdminNavItem[]; user: { name: string; roles: string[] } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav className="space-y-0.5">
      {items.map((i) => {
        const Icon = ICONS[i.icon] ?? LayoutDashboard;
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-brand-700 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
            <Icon className="h-4 w-4" />
            <span className="flex-1">{i.label}</span>
            {!!i.count && <span className={`rounded-full px-1.5 text-[11px] font-bold ${i.alert ? "bg-red-500 text-white" : "bg-white/10 text-slate-200"}`}>{i.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-night px-4 py-3 lg:hidden">
        <Logo dark compact />
        <button onClick={() => setOpen((o) => !o)} className="text-slate-200" aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && <div className="border-b border-white/10 bg-night p-3 lg:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-white/10 bg-night p-4 lg:flex">
        <Logo dark />
        <p className="mb-5 mt-1 pl-10 text-[11px] font-bold uppercase tracking-wider text-gold-300">Admin</p>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs capitalize text-slate-400">{user.roles.filter((r) => ["super_admin", "admin", "moderator", "support"].includes(r)).join(", ").replace(/_/g, " ")}</p>
          <Link href="/" className="mt-3 flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        </div>
      </aside>
    </>
  );
}
