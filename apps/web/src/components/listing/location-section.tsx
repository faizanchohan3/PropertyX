"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { GraduationCap, Hospital, Landmark, ShoppingCart, UtensilsCrossed, Trees, Bus, Route } from "lucide-react";

const LeafletMap = dynamic(() => import("../map/leaflet-map").then((m) => m.LeafletMap), { ssr: false, loading: () => <div className="h-80 w-full animate-pulse rounded-2xl bg-slate-100" /> });

const CATS = [
  { key: "schools", label: "Schools", icon: GraduationCap, color: "#2563eb" },
  { key: "hospitals", label: "Hospitals", icon: Hospital, color: "#dc2626" },
  { key: "mosques", label: "Mosques", icon: Landmark, color: "#047857" },
  { key: "markets", label: "Markets", icon: ShoppingCart, color: "#c9922a" },
  { key: "restaurants", label: "Restaurants", icon: UtensilsCrossed, color: "#ea580c" },
  { key: "parks", label: "Parks", icon: Trees, color: "#16a34a" },
  { key: "transport", label: "Public transport", icon: Bus, color: "#7c3aed" },
  { key: "roads", label: "Main roads", icon: Route, color: "#475569" },
] as const;

type Place = { name: string; distanceKm: number; lat: number; lng: number };

export function LocationSection({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  const [places, setPlaces] = useState<Record<string, Place[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string>("schools");
  useEffect(() => {
    fetch(`/api/v1/nearby?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((d) => (d.places ? setPlaces(d.places) : setError(d.error ?? "Nearby places unavailable")))
      .catch(() => setError("Nearby places unavailable"));
  }, [lat, lng]);
  const cat = CATS.find((c) => c.key === active)!;
  const markers = [
    { lat, lng, title: "Property", html: `<div style="transform:translate(-50%,-100%);background:#047857;color:white;font:600 12px sans-serif;padding:6px 10px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.3);white-space:nowrap">This property</div>` },
    ...(places?.[active] ?? []).map((p) => ({ lat: p.lat, lng: p.lng, title: p.name, popup: `<b>${p.name.replace(/</g, "&lt;")}</b><br/>${p.distanceKm} km away`, html: `<div style="width:14px;height:14px;border-radius:9999px;background:${cat.color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translate(-50%,-50%)"></div>` })),
  ];
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">{address}</p>
      <LeafletMap center={[lat, lng]} zoom={14} markers={markers} className="h-80 w-full" />
      <p className="mt-1 text-[11px] text-slate-400">Location shown is approximate. Map data © OpenStreetMap contributors.</p>
      <div className="mt-5">
        <p className="mb-3 font-semibold text-slate-900">Nearby places</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATS.map((c) => (
            <button key={c.key} onClick={() => setActive(c.key)} className={`chip shrink-0 text-xs ${active === c.key ? "chip-active" : ""}`}>
              <c.icon className="h-3.5 w-3.5" style={{ color: c.color }} /> {c.label}
              {places && <span className="text-slate-400">{places[c.key]?.length ?? 0}</span>}
            </button>
          ))}
        </div>
        <div className="mt-3">
          {!places && !error && <p className="text-sm text-slate-500">Loading nearby places…</p>}
          {error && <p className="text-sm text-slate-500">{error}</p>}
          {places && (places[active]?.length ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {places[active].map((p) => (
                <li key={p.name} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate text-slate-700">{p.name}</span>
                  <span className="shrink-0 text-slate-500">{p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)} m` : `${p.distanceKm} km`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No {cat.label.toLowerCase()} found within 1.5 km in OpenStreetMap data.</p>
          ))}
        </div>
      </div>
    </div>
  );
}
