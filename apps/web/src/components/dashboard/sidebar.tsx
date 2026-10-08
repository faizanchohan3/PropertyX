"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Circle, LayoutDashboard, BarChart3, Building2, Users, CalendarDays, MessageSquare, Megaphone, UsersRound, HardHat, IdCard, Star, KeyRound, Home, Heart, BellRing, ShieldCheck, CreditCard, Settings, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = { LayoutDashboard, BarChart3, Building2, Users, CalendarDays, MessageSquare, Megaphone, UsersRound, HardHat, IdCard, Star, KeyRound, Home, Heart, BellRing, ShieldCheck, CreditCard, Settings };

type Item = { href: string; label: string; icon: string };

export function DashboardSidebar({ groups, user }: { groups: { title: string; items: Item[] }[]; user: { name: string; role: string } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const current = groups.flatMap((g) => g.items).find((i) => active(i.href));
  const nav = (
    <nav className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const Icon = ICONS[i.icon] ?? Circle;
              return (
                <li key={i.href}>
                  <Link href={i.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${active(i.href) ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                    <Icon className="h-4 w-4" /> {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  return (
    <>
      <div className="lg:hidden">
        <button onClick={() => setOpen((o) => !o)} className="btn-outline w-full justify-between">
          <span>{current?.label ?? "Menu"}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
        {open && <div className="card mt-2 p-3">{nav}</div>}
      </div>
      <aside className="hidden lg:block">
        <div className="card sticky top-20 p-4">
          <div className="mb-4 border-b border-slate-100 px-3 pb-4">
            <p className="truncate font-bold text-slate-900">{user.name}</p>
            <p className="text-xs capitalize text-slate-500">{user.role.replace(/_/g, " ")}</p>
          </div>
          {nav}
        </div>
      </aside>
    </>
  );
}
