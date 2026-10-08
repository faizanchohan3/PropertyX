"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Map as LMap, LayerGroup, Polygon, Circle, Polyline } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Pentagon, CircleDot, X, List, RefreshCw, MapPin, Loader2, SlidersHorizontal } from "lucide-react";
import { formatPriceShort, formatPKR, formatArea, parseSearchQuery, serializeSearchQuery, PROPERTY_TYPES, type SearchQuery } from "@propertyx/shared";
import type { MapResult, ListingCard } from "@propertyx/search";

const TILE = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTR = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "&copy; OpenStreetMap contributors";
const POI = [
  { key: "schools", label: "Schools", color: "#2563eb" },
  { key: "hospitals", label: "Hospitals", color: "#dc2626" },
  { key: "mosques", label: "Mosques", color: "#047857" },
  { key: "markets", label: "Markets", color: "#c9922a" },
  { key: "restaurants", label: "Restaurants", color: "#ea580c" },
  { key: "parks", label: "Parks", color: "#16a34a" },
  { key: "transport", label: "Transport", color: "#7c3aed" },
  { key: "roads", label: "Main roads", color: "#475569" },
];

type Mode = "none" | "polygon" | "radius";

export function MapSearch({ cities }: { cities: { slug: string; name: string; lat: number; lng: number }[] }) {
  const sp = useSearchParams();
  const initial = useMemo(() => parseSearchQuery(sp), [sp]);
  const [filters, setFilters] = useState<SearchQuery>(() => {
    const { bbox: _b, page: _p, ...rest } = initial;
    return rest;
  });
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const pins = useRef<LayerGroup | null>(null);
  const shapes = useRef<LayerGroup | null>(null);
  const poiLayer = useRef<LayerGroup | null>(null);
  const drawPts = useRef<[number, number][]>([]);
  const drawLine = useRef<Polyline | null>(null);
  const [data, setData] = useState<(MapResult & { list: ListingCard[]; listTotal: number }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<Mode>("none");
  const [radiusKm, setRadiusKm] = useState(initial.radiusKm ?? 3);
  const [poi, setPoi] = useState<string[]>([]);
  const [showList, setShowList] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const autoRef = useRef(auto);
  autoRef.current = auto;

  const load = useCallback(
    async (f: SearchQuery) => {
      const m = map.current;
      if (!m) return;
      const b = m.getBounds();
      const q: SearchQuery = { ...f };
      if (!f.polygon && !(f.lat != null && f.radiusKm)) q.bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(",");
      const qs = serializeSearchQuery(q);
      qs.set("zoom", String(m.getZoom()));
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/map?${qs.toString()}`);
        setData(await r.json());
        setDirty(false);
        const urlQs = serializeSearchQuery({ ...f, page: undefined });
        window.history.replaceState(null, "", `/map?${urlQs.toString()}`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // init map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !el.current || map.current) return;
      L.current = leaflet;
      const city = cities.find((c) => c.slug === initial.city);
      const center: [number, number] = initial.lat != null && initial.lng != null ? [initial.lat, initial.lng] : city ? [city.lat, city.lng] : [30.3753, 69.3451];
      const m = leaflet.map(el.current, { center, zoom: initial.lat != null ? 13 : city ? 12 : 6, zoomControl: false });
      leaflet.control.zoom({ position: "bottomright" }).addTo(m);
      leaflet.tileLayer(TILE, { attribution: ATTR, maxZoom: 19 }).addTo(m);
      pins.current = leaflet.layerGroup().addTo(m);
      shapes.current = leaflet.layerGroup().addTo(m);
      poiLayer.current = leaflet.layerGroup().addTo(m);
      map.current = m;
      m.on("moveend", () => {
        if (modeRef.current !== "none") return;
        if (autoRef.current) setFilters((f) => ({ ...f }));
        else setDirty(true);
      });
      m.on("click", (e) => {
        if (modeRef.current === "polygon") {
          drawPts.current.push([e.latlng.lat, e.latlng.lng]);
          drawLine.current?.remove();
          drawLine.current = leaflet.polyline(drawPts.current, { color: "#c9922a", dashArray: "6 6" }).addTo(shapes.current!);
        } else if (modeRef.current === "radius") {
          setMode("none");
          setFilters((f) => ({ ...f, polygon: undefined, lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5), radiusKm: f.radiusKm ?? 3 }));
        }
      });
      m.on("dblclick", (e) => {
        if (modeRef.current === "polygon") {
          leaflet.DomEvent.stop(e);
          finishPolygon();
        }
      });
      setFilters((f) => ({ ...f }));
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload when filters change
  useEffect(() => {
    if (map.current) load(filters);
  }, [filters, load]);

  // draw shapes for active polygon / radius
  useEffect(() => {
    const leaflet = L.current;
    if (!leaflet || !shapes.current) return;
    if (mode !== "polygon") shapes.current.clearLayers();
    if (filters.polygon) {
      const pts = filters.polygon.split(";").map((p) => p.split(" ").map(Number) as [number, number]);
      const poly: Polygon = leaflet.polygon(pts, { color: "#c9922a", weight: 2, fillOpacity: 0.06 }).addTo(shapes.current);
      void poly;
    }
    if (filters.lat != null && filters.lng != null && filters.radiusKm) {
      const c: Circle = leaflet.circle([filters.lat, filters.lng], { radius: filters.radiusKm * 1000, color: "#c9922a", weight: 2, fillOpacity: 0.06 }).addTo(shapes.current);
      map.current?.fitBounds(c.getBounds(), { padding: [20, 20] });
    }
  }, [filters.polygon, filters.lat, filters.lng, filters.radiusKm, mode]);

  // render pins / clusters
  useEffect(() => {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m || !pins.current || !data) return;
    pins.current.clearLayers();
    for (const f of data.features) {
      if (f.kind === "cluster") {
        const size = Math.min(64, 30 + Math.log2(f.count) * 6);
        const icon = leaflet.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;transform:translate(-50%,-50%);border-radius:9999px;background:rgba(4,120,87,.9);border:3px solid rgba(255,255,255,.9);box-shadow:0 2px 10px rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font:700 12px/1.1 sans-serif">${f.count}<span style="font:500 9px sans-serif;opacity:.85">from ${formatPriceShort(f.minPrice)}</span></div>`,
          iconSize: [0, 0],
        });
        leaflet
          .marker([f.lat, f.lng], { icon, title: `${f.count} properties` })
          .on("click", () => m.fitBounds([[f.bbox[1], f.bbox[0]], [f.bbox[3], f.bbox[2]]], { padding: [40, 40], maxZoom: m.getZoom() + 3 }))
          .addTo(pins.current);
      } else {
        const isActive = active === f.id;
        const icon = leaflet.divIcon({
          className: "",
          html: `<div style="transform:translate(-50%,-100%);background:${isActive ? "#c9922a" : f.purpose === "rent" ? "#1e3a8a" : "#047857"};color:white;font:700 11px sans-serif;padding:4px 8px;border-radius:9px;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap;position:relative">${formatPriceShort(f.price)}</div>`,
          iconSize: [0, 0],
        });
        const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
        leaflet
          .marker([f.lat, f.lng], { icon, title: f.title, zIndexOffset: isActive ? 1000 : 0 })
          .bindPopup(
            `<a href="/property/${f.slug}" style="display:block;width:220px;text-decoration:none;color:inherit">${f.coverUrl ? `<img src="${f.coverUrl.replace(/w=\d+/, "w=440")}" style="width:100%;height:120px;object-fit:cover;border-radius:8px" alt=""/>` : ""}<div style="font:800 15px sans-serif;margin-top:6px">${formatPKR(f.price)}${f.purpose === "rent" ? "/mo" : ""}</div><div style="font:500 12px sans-serif;color:#334155;margin-top:2px">${esc(f.title)}</div><div style="font:12px sans-serif;color:#64748b;margin-top:2px">${f.beds != null ? `${f.beds} beds · ` : ""}${formatArea(f.areaValue, f.areaUnit)}</div></a>`,
          )
          .on("click", () => setActive(f.id))
          .addTo(pins.current);
      }
    }
  }, [data, active]);

  // nearby POIs for the map centre
  useEffect(() => {
    const leaflet = L.current;
    const m = map.current;
    if (!leaflet || !m || !poiLayer.current) return;
    poiLayer.current.clearLayers();
    if (!poi.length) return;
    if (m.getZoom() < 13) {
      m.setZoom(14);
      return;
    }
    const c = m.getCenter();
    let cancelled = false;
    fetch(`/api/v1/nearby?lat=${c.lat.toFixed(4)}&lng=${c.lng.toFixed(4)}&radius=2500`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.places) return;
        for (const cat of POI.filter((p) => poi.includes(p.key))) {
          for (const p of d.places[cat.key] ?? []) {
            leaflet
              .marker([p.lat, p.lng], { icon: leaflet.divIcon({ className: "", html: `<div style="width:12px;height:12px;transform:translate(-50%,-50%);border-radius:9999px;background:${cat.color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`, iconSize: [0, 0] }), title: p.name })
              .bindTooltip(`${p.name} (${cat.label})`)
              .addTo(poiLayer.current!);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [poi, data]);

  const finishPolygon = () => {
    const pts = drawPts.current;
    drawPts.current = [];
    drawLine.current?.remove();
    setMode("none");
    map.current?.doubleClickZoom.enable();
    if (pts.length < 3) return;
    setFilters((f) => ({ ...f, lat: undefined, lng: undefined, radiusKm: undefined, polygon: pts.map(([a, b]) => `${a.toFixed(5)} ${b.toFixed(5)}`).join(";") }));
    const leaflet = L.current!;
    map.current?.fitBounds(leaflet.latLngBounds(pts), { padding: [20, 20] });
  };

  const startDraw = (m: Mode) => {
    drawPts.current = [];
    shapes.current?.clearLayers();
    if (m === "polygon") map.current?.doubleClickZoom.disable();
    setMode(m);
  };
  const clearShape = () => setFilters((f) => ({ ...f, polygon: undefined, lat: undefined, lng: undefined, radiusKm: undefined }));
  const hasShape = !!filters.polygon || (filters.lat != null && !!filters.radiusKm);

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col md:flex-row">
      {/* list */}
      <div className={`order-2 w-full overflow-y-auto border-slate-200 bg-white md:order-1 md:w-[400px] md:shrink-0 md:border-r ${showList ? "h-[45%] md:h-auto" : "hidden md:block"}`}>
        <div className="sticky top-0 z-10 space-y-3 border-b border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {loading ? <Loader2 className="inline h-4 w-4 animate-spin" /> : `${(data?.total ?? 0).toLocaleString()} properties in view`}
            </p>
            <Link href={`/search?${serializeSearchQuery({ ...filters }).toString()}`} className="text-sm font-semibold text-brand-700">
              List view
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select aria-label="Purpose" className="input py-2 text-xs" value={filters.purpose ?? ""} onChange={(e) => setFilters((f) => ({ ...f, purpose: (e.target.value || undefined) as SearchQuery["purpose"] }))}>
              <option value="">Buy & rent</option>
              <option value="sale">Buy</option>
              <option value="rent">Rent</option>
            </select>
            <select aria-label="Type" className="input py-2 text-xs" value={filters.types?.[0] ?? ""} onChange={(e) => setFilters((f) => ({ ...f, types: e.target.value ? [e.target.value as never] : undefined }))}>
              <option value="">All types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <select aria-label="Max price" className="input py-2 text-xs" value={filters.priceMax ?? ""} onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : undefined }))}>
              <option value="">Any price</option>
              {(filters.purpose === "rent" ? [50_000, 100_000, 200_000, 500_000] : [5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000]).map((p) => (
                <option key={p} value={p}>
                  ≤ {formatPriceShort(p)}
                </option>
              ))}
            </select>
          </div>
          <Link href={`/search?${serializeSearchQuery(filters).toString()}`} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700">
            <SlidersHorizontal className="h-3.5 w-3.5" /> More filters in list view
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {data?.list.map((l) => (
            <li key={l.id} onMouseEnter={() => setActive(l.id)} className={active === l.id ? "bg-brand-50/60" : ""}>
              <Link href={`/property/${l.slug}`} className="flex gap-3 p-3">
                {l.coverUrl && <img src={l.coverUrl.replace(/w=\d+/, "w=240")} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" loading="lazy" />}
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">
                    {formatPKR(l.price)}
                    {l.purpose === "rent" ? "/mo" : ""}
                  </p>
                  <p className="line-clamp-2 text-sm text-slate-700">{l.title}</p>
                  <p className="truncate text-xs text-slate-500">{l.locationFullName}</p>
                </div>
              </Link>
            </li>
          ))}
          {data && data.list.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No properties here. Zoom out or move the map.</li>}
        </ul>
      </div>

      {/* map */}
      <div className="relative order-1 flex-1 md:order-2">
        <div ref={el} className="h-full w-full" />
        <div className="absolute left-3 right-3 top-3 z-[400] flex flex-wrap items-start gap-2">
          <select
            aria-label="Jump to city"
            className="input w-auto bg-white py-2 shadow-md"
            defaultValue={initial.city ?? ""}
            onChange={(e) => {
              const c = cities.find((x) => x.slug === e.target.value);
              if (c) map.current?.setView([c.lat, c.lng], 12);
            }}
          >
            <option value="">Jump to city…</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={() => (mode === "polygon" ? finishPolygon() : startDraw("polygon"))} className={`btn bg-white py-2 shadow-md ${mode === "polygon" ? "ring-2 ring-gold-400" : ""}`}>
            <Pentagon className="h-4 w-4" /> {mode === "polygon" ? "Finish area" : "Draw area"}
          </button>
          <div className="flex items-center gap-1 rounded-xl bg-white px-2 shadow-md">
            <button onClick={() => startDraw("radius")} className={`btn px-2 py-2 ${mode === "radius" ? "text-gold-600" : ""}`}>
              <CircleDot className="h-4 w-4" /> Radius
            </button>
            <select
              aria-label="Radius"
              className="bg-transparent py-2 text-sm"
              value={radiusKm}
              onChange={(e) => {
                const km = Number(e.target.value);
                setRadiusKm(km);
                if (filters.lat != null) setFilters((f) => ({ ...f, radiusKm: km }));
              }}
            >
              {[1, 2, 3, 5, 10, 20].map((k) => (
                <option key={k} value={k}>
                  {k} km
                </option>
              ))}
            </select>
          </div>
          {hasShape && (
            <button onClick={clearShape} className="btn bg-white py-2 text-red-600 shadow-md">
              <X className="h-4 w-4" /> Clear area
            </button>
          )}
          <button onClick={() => setShowList((s) => !s)} className="btn bg-white py-2 shadow-md md:hidden">
            <List className="h-4 w-4" />
          </button>
        </div>
        {mode !== "none" && (
          <div className="absolute left-1/2 top-16 z-[400] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
            {mode === "polygon" ? "Click to add points, double-click (or Finish area) to close the shape." : "Click the map to set the centre of your search."}
            <button onClick={() => { setMode("none"); drawPts.current = []; drawLine.current?.remove(); map.current?.doubleClickZoom.enable(); }} className="ml-3 underline">
              Cancel
            </button>
          </div>
        )}
        <div className="absolute bottom-6 left-1/2 z-[400] flex -translate-x-1/2 flex-col items-center gap-2">
          {dirty && !auto && (
            <button onClick={() => load(filters)} className="btn-primary shadow-lg">
              <RefreshCw className="h-4 w-4" /> Search this area
            </button>
          )}
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-md">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-brand-700" /> Search as I move the map
          </label>
        </div>
        <div className="absolute bottom-6 left-3 z-[400] hidden max-w-[240px] rounded-xl bg-white p-3 shadow-md sm:block">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700">
            <MapPin className="h-3.5 w-3.5" /> Nearby (OpenStreetMap)
          </p>
          <div className="flex flex-wrap gap-1">
            {POI.map((p) => (
              <button key={p.key} onClick={() => setPoi((x) => (x.includes(p.key) ? x.filter((k) => k !== p.key) : [...x, p.key]))} className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ${poi.includes(p.key) ? "text-white" : "text-slate-600 ring-slate-200"}`} style={poi.includes(p.key) ? { background: p.color, boxShadow: "none" } : undefined}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
