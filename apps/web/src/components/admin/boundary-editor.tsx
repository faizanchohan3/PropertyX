"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as LMap, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { darkBtn, okBtn } from "./ui";

type Pt = [number, number];
const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Click on the map to trace an area / society boundary; saved to the location_boundaries setting. */
export function BoundaryEditor({ slug, name, center, saved }: { slug: string; name: string; center: Pt; saved: Pt[] | null }) {
  const router = useRouter();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const drawLayer = useRef<LayerGroup | null>(null);
  const refLayer = useRef<LayerGroup | null>(null);
  const [pts, setPts] = useState<Pt[]>(saved ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const m = leaflet.map(el.current, { center, zoom: 15, doubleClickZoom: false });
      leaflet.tileLayer(TILE, { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 }).addTo(m);
      refLayer.current = leaflet.layerGroup().addTo(m);
      drawLayer.current = leaflet.layerGroup().addTo(m);
      m.on("click", (e) => setPts((p) => [...p, [+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]]));
      map.current = m;
      // reference: the approximate outline from listings, plus listing pins, to trace against
      const b = m.getBounds();
      fetch(`/api/v1/map?bbox=${[b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(",")}&zoom=15`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !refLayer.current) return;
          const mine = d.boundaries?.find((x: { slug: string; source: string }) => x.slug === slug && x.source === "approximate");
          if (mine) leaflet.polygon(mine.polygon, { color: "#d97706", weight: 2, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(refLayer.current);
          for (const f of d.features ?? []) if (f.kind === "pin") leaflet.circleMarker([f.lat, f.lng], { radius: 3, color: "#64748b", weight: 1, fillOpacity: 0.8, interactive: false }).addTo(refLayer.current);
          if (!saved?.length && mine) m.fitBounds(leaflet.polygon(mine.polygon).getBounds(), { padding: [30, 30] });
        })
        .catch(() => {});
      if (saved?.length) m.fitBounds(leaflet.polygon(saved).getBounds(), { padding: [30, 30] });
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const leaflet = L.current;
    const layer = drawLayer.current;
    if (!leaflet || !layer) return;
    layer.clearLayers();
    if (pts.length >= 3) leaflet.polygon(pts, { color: "#10b981", weight: 3, fillOpacity: 0.12, interactive: false }).addTo(layer);
    else if (pts.length === 2) leaflet.polyline(pts, { color: "#10b981", weight: 3, interactive: false }).addTo(layer);
    pts.forEach((p, i) => leaflet.circleMarker(p, { radius: i === 0 ? 6 : 4, color: "#fff", weight: 2, fillColor: "#047857", fillOpacity: 1, interactive: false }).addTo(layer));
  }, [pts]);

  const save = async (polygon: Pt[] | null) => {
    setBusy(true);
    try {
      await api("/api/v1/admin/location.boundary", { body: { slug, polygon } });
      toast(polygon ? `Boundary saved for ${name}` : `Boundary removed for ${name}`);
      if (!polygon) setPts([]);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-white">Boundary on the map</p>
      <p className="text-xs text-slate-400">
        Click around the edge of {name} to trace its boundary (zoom in for accuracy). The dashed orange outline is the current approximation from listing locations; grey dots are listings.
      </p>
      <div ref={el} className="h-80 w-full overflow-hidden rounded-xl" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">{pts.length} points</span>
        <button type="button" className={darkBtn} onClick={() => setPts((p) => p.slice(0, -1))} disabled={!pts.length}>
          <Undo2 className="h-3.5 w-3.5" /> Undo point
        </button>
        <button type="button" className={darkBtn} onClick={() => setPts([])} disabled={!pts.length}>
          Start over
        </button>
        <button type="button" className={okBtn} onClick={() => save(pts)} disabled={busy || pts.length < 3}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save boundary
        </button>
        {saved?.length ? (
          <button type="button" className={`${darkBtn} text-red-300`} onClick={() => save(null)} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" /> Remove saved boundary
          </button>
        ) : null}
      </div>
    </div>
  );
}
