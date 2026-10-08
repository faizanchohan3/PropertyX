"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles, Upload, Trash2, ArrowUp, ArrowDown, AlertTriangle, ImagePlus, Home, KeyRound } from "lucide-react";
import { PROPERTY_TYPES, FEATURES, FEATURE_GROUP_LABELS, FURNISHING_LABELS, CONDITION_LABELS, AREA_UNIT_LABELS, formatPKR, formatArea, propertyTypeInfo, type AreaUnit } from "@propertyx/shared";
import { api, ApiError } from "@/lib/client";
import { toast } from "../toast";
import type { MapMarker } from "../map/leaflet-map";

const LeafletMap = dynamic(() => import("../map/leaflet-map").then((m) => m.LeafletMap), { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-2xl bg-slate-100" /> });

type Media = { id: string; url: string; kind: "image" | "floor_plan"; caption?: string };
export interface WizardData {
  purpose: "sale" | "rent";
  type: string;
  cityId: string;
  areaId: string | null;
  societyId: string | null;
  blockId: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  price: number | null;
  rentPeriod: "monthly" | "yearly" | null;
  installmentAvailable: boolean;
  advanceAmount: number | null;
  monthlyInstallment: number | null;
  installmentsRemaining: number | null;
  areaValue: number | null;
  areaUnit: AreaUnit;
  beds: number | null;
  baths: number | null;
  parkingSpaces: number | null;
  floors: number | null;
  floorNumber: number | null;
  yearBuilt: number | null;
  furnishing: string | null;
  condition: string | null;
  features: string[];
  title: string;
  description: string;
  highlights: string[];
  videoUrl: string;
  tourUrl: string;
  contactName: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  media: Media[];
}

const STEPS = ["Purpose", "Property type", "Location", "Price", "Details", "Amenities", "Images", "Video", "Contact", "Preview", "Submit"];
const DRAFT_KEY = "px_listing_draft";

type City = { id: string; name: string; slug: string; lat: number; lng: number };
type Tree = { areas: { id: string; name: string; lat: number; lng: number }[]; societies: { id: string; name: string; lat: number; lng: number }[]; blocks: { id: string; name: string; societyId: string | null; areaId: string | null; lat: number | null; lng: number | null }[] };

export function ListingWizard({ initial, listingId, contact, cities }: { initial?: Partial<WizardData>; listingId?: string; contact: { name: string; phone: string; email: string }; cities: City[] }) {
  const router = useRouter();
  const blank: WizardData = {
    purpose: "sale",
    type: "",
    cityId: "",
    areaId: null,
    societyId: null,
    blockId: null,
    address: "",
    lat: null,
    lng: null,
    price: null,
    rentPeriod: "monthly",
    installmentAvailable: false,
    advanceAmount: null,
    monthlyInstallment: null,
    installmentsRemaining: null,
    areaValue: null,
    areaUnit: "marla",
    beds: null,
    baths: null,
    parkingSpaces: null,
    floors: null,
    floorNumber: null,
    yearBuilt: null,
    furnishing: null,
    condition: null,
    features: [],
    title: "",
    description: "",
    highlights: [],
    videoUrl: "",
    tourUrl: "",
    contactName: contact.name,
    contactPhone: contact.phone,
    contactWhatsapp: contact.phone,
    contactEmail: contact.email,
    media: [],
  };
  const [d, setD] = useState<WizardData>({ ...blank, ...initial });
  const [step, setStep] = useState(0);
  const [tree, setTree] = useState<Tree | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<{ field: string; severity: string; message: string }[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const loaded = useRef(false);
  const set = (patch: Partial<WizardData>) => setD((x) => ({ ...x, ...patch }));
  const info = propertyTypeInfo(d.type);
  const rooms = !!info?.hasRooms && d.type !== "room";
  const isAptLike = ["flat", "apartment", "penthouse", "office", "shop"].includes(d.type);

  // restore / persist new-listing drafts locally
  useEffect(() => {
    if (listingId || loaded.current) return;
    loaded.current = true;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setD((x) => ({ ...x, ...parsed.data }));
        setStep(Math.min(parsed.step ?? 0, STEPS.length - 1));
        toast("Restored your unfinished listing");
      }
    } catch {
      /* ignore */
    }
  }, [listingId]);
  useEffect(() => {
    if (listingId) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: d, step }));
    } catch {
      /* ignore */
    }
  }, [d, step, listingId]);

  useEffect(() => {
    if (!d.cityId) return setTree(null);
    fetch(`/api/v1/locations/tree?cityId=${d.cityId}`)
      .then((r) => r.json())
      .then(setTree);
  }, [d.cityId]);

  const city = cities.find((c) => c.id === d.cityId);
  const parentKey = d.societyId ? `s:${d.societyId}` : d.areaId ? `a:${d.areaId}` : "";
  const blocks = tree?.blocks.filter((b) => (d.societyId ? b.societyId === d.societyId : d.areaId ? b.areaId === d.areaId && !b.societyId : false)) ?? [];
  const locationName = d.societyId ? tree?.societies.find((s) => s.id === d.societyId)?.name : d.areaId ? tree?.areas.find((a) => a.id === d.areaId)?.name : undefined;
  const blockName = blocks.find((b) => b.id === d.blockId)?.name;

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0 && !d.purpose) e.purpose = "Choose sale or rent";
    if (s === 1 && !d.type) e.type = "Choose a property type";
    if (s === 2) {
      if (!d.cityId) e.cityId = "Choose a city";
      if (!parentKey) e.area = "Choose the area or society";
    }
    if (s === 3) {
      if (!d.price || d.price <= 0) e.price = "Enter the price";
      if (d.installmentAvailable && (!d.advanceAmount || !d.monthlyInstallment)) e.installments = "Enter advance and monthly installment";
    }
    if (s === 4) {
      if (!d.areaValue || d.areaValue <= 0) e.areaValue = "Enter the area";
      if (rooms && d.beds == null) e.beds = "Enter bedrooms";
    }
    if (s === 6 && d.media.filter((m) => m.kind === "image").length < 1 && d.type !== "agricultural_land") e.images = "Add at least one photo";
    if (s === 7) {
      if (d.videoUrl && !/^https:\/\//.test(d.videoUrl)) e.videoUrl = "Use a full https:// link (YouTube or Vimeo)";
      if (d.tourUrl && !/^https:\/\//.test(d.tourUrl)) e.tourUrl = "Use a full https:// link";
    }
    if (s === 8) {
      if (d.contactName.trim().length < 2) e.contactName = "Enter a contact name";
      if (!/^(\+92|0)3\d{2}\s?-?\d{7}$/.test(d.contactPhone.replace(/\s/g, ""))) e.contactPhone = "Enter a valid mobile number, e.g. 0300 1234567";
    }
    if (s === 9) {
      if (d.title.trim().length < 10) e.title = "Title should be at least 10 characters";
      if (d.description.trim().length < 40) e.description = "Description should be at least 40 characters";
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const draftForAi = useMemo(
    () => ({
      purpose: d.purpose,
      type: d.type,
      areaValue: d.areaValue,
      areaUnit: d.areaUnit,
      beds: d.beds,
      baths: d.baths,
      floors: d.floors,
      floorNumber: d.floorNumber,
      yearBuilt: d.yearBuilt,
      furnishing: d.furnishing,
      condition: d.condition,
      features: d.features,
      price: d.price,
      locationName,
      blockName,
      cityName: city?.name,
      installmentAvailable: d.installmentAvailable,
      imageCount: d.media.filter((m) => m.kind === "image").length,
      hasFloorPlan: d.media.some((m) => m.kind === "floor_plan"),
      hasVideo: !!d.videoUrl,
      hasCoordinates: d.lat != null,
      description: d.description,
      title: d.title,
    }),
    [d, locationName, blockName, city],
  );

  useEffect(() => {
    if (step !== 9) return;
    api<{ missing: typeof missing }>("/api/v1/ai/listing-copy", { body: { ...draftForAi, mode: "check" } })
      .then((r) => setMissing(r.missing))
      .catch(() => {});
  }, [step, draftForAi]);

  const aiWrite = async () => {
    setAiBusy(true);
    try {
      const r = await api<{ title: string; description: string; highlights: string[]; source: string; missing: typeof missing }>("/api/v1/ai/listing-copy", { body: { ...draftForAi, notes: d.description } });
      set({ title: r.title, description: r.description, highlights: r.highlights });
      setMissing(r.missing);
      toast(r.source === "rules" ? "Draft written from your details — edit freely" : "AI draft ready — review and edit before submitting");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setAiBusy(false);
    }
  };

  const payload = () => ({
    ...d,
    price: d.price ?? 0,
    areaValue: d.areaValue ?? 0,
    rentPeriod: d.purpose === "rent" ? d.rentPeriod : null,
    contactWhatsapp: d.contactWhatsapp || undefined,
    contactEmail: d.contactEmail || undefined,
    videoUrl: d.videoUrl || undefined,
    tourUrl: d.tourUrl || undefined,
    media: d.media.map((m) => ({ id: m.id, kind: m.kind, caption: m.caption })),
  });

  const save = async (submit: boolean) => {
    for (let s = 0; s <= 9; s++) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        toast(Object.values(e)[0], "error");
        return;
      }
    }
    setBusy(true);
    try {
      const r = listingId
        ? await api<{ id: string; slug: string; status: string }>(`/api/v1/listings/${listingId}${submit ? "?submit=1" : ""}`, { method: "PUT", body: payload() })
        : await api<{ id: string; slug: string; status: string }>(`/api/v1/listings${submit ? "?submit=1" : ""}`, { body: payload() });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      toast(r.status === "active" ? "Your listing is live!" : r.status === "pending_review" ? "Submitted for review. We'll notify you when it's approved." : "Saved");
      router.push(`/dashboard/listings?created=${r.id}`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.details?.fieldErrors) {
        const fe = Object.fromEntries(Object.entries(e.details.fieldErrors).map(([k, v]) => [k, v[0]]));
        setErrors(fe);
      }
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => (errors[k] ? <p className="mt-1 text-xs font-medium text-red-600">{errors[k]}</p> : null);
  const num = (v: string) => (v === "" ? null : Number(v.replace(/,/g, "")));

  return (
    <div className="mx-auto max-w-4xl">
      {/* progress */}
      <ol className="mb-8 flex gap-1 overflow-x-auto pb-2 scrollbar-none">
        {STEPS.map((s, i) => (
          <li key={s} className="shrink-0">
            <button onClick={() => i < step && setStep(i)} disabled={i > step} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${i === step ? "bg-brand-700 text-white" : i < step ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-slate-400"}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i === step ? "bg-white/20" : i < step ? "bg-brand-700 text-white" : "bg-white"}`}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-8">
        <h2 className="mb-1 text-xl font-bold">
          Step {step + 1}: {STEPS[step]}
        </h2>

        {step === 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(["sale", "rent"] as const).map((p) => (
              <button key={p} onClick={() => set({ purpose: p, type: p === "rent" && d.type.includes("plot") ? "" : d.type })} className={`rounded-2xl border-2 p-6 text-left transition ${d.purpose === p ? "border-brand-700 bg-brand-50" : "border-slate-200 hover:border-slate-300"}`}>
                {p === "sale" ? <Home className="h-8 w-8 text-brand-700" /> : <KeyRound className="h-8 w-8 text-brand-700" />}
                <p className="mt-3 text-lg font-bold">{p === "sale" ? "Sell" : "Rent out"}</p>
                <p className="text-sm text-slate-500">{p === "sale" ? "List your property for sale" : "Find a tenant for your property"}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="mt-5 space-y-5">
            {(["residential", "plot", "commercial", "agricultural"] as const).map((cat) => {
              const types = PROPERTY_TYPES.filter((t) => t.category === cat && !(d.purpose === "rent" && t.category === "plot"));
              if (!types.length) return null;
              return (
                <div key={cat}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{cat === "plot" ? "Plots" : cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {types.map((t) => (
                      <button key={t.key} onClick={() => set({ type: t.key, beds: t.hasRooms ? d.beds : null, baths: t.hasRooms ? d.baths : null, areaUnit: t.key === "agricultural_land" ? "acre" : ["flat", "apartment", "penthouse", "office", "shop", "warehouse", "room"].includes(t.key) ? "sqft" : d.areaUnit === "sqft" || d.areaUnit === "acre" ? "marla" : d.areaUnit })} className={`chip ${d.type === t.key ? "chip-active" : ""}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {err("type")}
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="w-city">City</label>
                <select id="w-city" className="input" value={d.cityId} onChange={(e) => set({ cityId: e.target.value, areaId: null, societyId: null, blockId: null, lat: null, lng: null })}>
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {err("cityId")}
              </div>
              <div>
                <label className="label" htmlFor="w-area">Area / housing society</label>
                <select
                  id="w-area"
                  className="input"
                  value={parentKey}
                  disabled={!tree}
                  onChange={(e) => {
                    const [k, id] = e.target.value.split(":");
                    const src = k === "s" ? tree?.societies.find((x) => x.id === id) : tree?.areas.find((x) => x.id === id);
                    set({ societyId: k === "s" ? id : null, areaId: k === "a" ? id : null, blockId: null, lat: src?.lat ?? null, lng: src?.lng ?? null });
                  }}
                >
                  <option value="">Select area or society</option>
                  {tree && tree.societies.length > 0 && (
                    <optgroup label="Housing societies">
                      {tree.societies.map((s) => (
                        <option key={s.id} value={`s:${s.id}`}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {tree && tree.areas.length > 0 && (
                    <optgroup label="Areas">
                      {tree.areas.map((a) => (
                        <option key={a.id} value={`a:${a.id}`}>
                          {a.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {err("area")}
              </div>
            </div>
            {blocks.length > 0 && (
              <div>
                <label className="label" htmlFor="w-block">Block / phase / sector</label>
                <select
                  id="w-block"
                  className="input"
                  value={d.blockId ?? ""}
                  onChange={(e) => {
                    const b = blocks.find((x) => x.id === e.target.value);
                    set({ blockId: e.target.value || null, ...(b?.lat && b.lng ? { lat: b.lat, lng: b.lng } : {}) });
                  }}
                >
                  <option value="">Not specified</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="w-address">Street address (optional)</label>
              <input id="w-address" className="input" placeholder="e.g. Street 12, near Park" value={d.address} onChange={(e) => set({ address: e.target.value })} maxLength={200} />
            </div>
            {city && (
              <div>
                <p className="label">Pin the location (click the map)</p>
                <PinMap center={[d.lat ?? city.lat, d.lng ?? city.lng]} pin={d.lat != null && d.lng != null ? [d.lat, d.lng] : null} onPick={(lat, lng) => set({ lat, lng })} />
                <p className="mt-1 text-xs text-slate-500">Buyers see an approximate location. You can drop the pin on your street.</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <div>
                <label className="label" htmlFor="w-price">{d.purpose === "rent" ? "Monthly rent (PKR)" : "Asking price (PKR)"}</label>
                <input id="w-price" inputMode="numeric" className="input text-lg font-semibold" placeholder={d.purpose === "rent" ? "e.g. 85000" : "e.g. 25000000"} value={d.price ?? ""} onChange={(e) => set({ price: num(e.target.value.replace(/\D/g, "")) })} />
                {d.price ? <p className="mt-1 text-sm font-medium text-brand-700">{formatPKR(d.price)}</p> : null}
                {err("price")}
              </div>
              {d.purpose === "rent" && (
                <div>
                  <label className="label" htmlFor="w-period">Rent period</label>
                  <select id="w-period" className="input" value={d.rentPeriod ?? "monthly"} onChange={(e) => set({ rentPeriod: e.target.value as "monthly" })}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}
            </div>
            {d.purpose === "sale" && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={d.installmentAvailable} onChange={(e) => set({ installmentAvailable: e.target.checked })} /> Available on installments
              </label>
            )}
            {d.installmentAvailable && (
              <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="w-adv">Advance (PKR)</label>
                  <input id="w-adv" inputMode="numeric" className="input" value={d.advanceAmount ?? ""} onChange={(e) => set({ advanceAmount: num(e.target.value.replace(/\D/g, "")) })} />
                </div>
                <div>
                  <label className="label" htmlFor="w-mi">Monthly installment</label>
                  <input id="w-mi" inputMode="numeric" className="input" value={d.monthlyInstallment ?? ""} onChange={(e) => set({ monthlyInstallment: num(e.target.value.replace(/\D/g, "")) })} />
                </div>
                <div>
                  <label className="label" htmlFor="w-ir">Installments left</label>
                  <input id="w-ir" inputMode="numeric" className="input" value={d.installmentsRemaining ?? ""} onChange={(e) => set({ installmentsRemaining: num(e.target.value.replace(/\D/g, "")) })} />
                </div>
                {err("installments")}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <div>
                <label className="label" htmlFor="w-area-v">{isAptLike ? "Covered area" : "Plot / land area"}</label>
                <input id="w-area-v" inputMode="decimal" className="input" value={d.areaValue ?? ""} onChange={(e) => set({ areaValue: num(e.target.value) })} />
                {err("areaValue")}
              </div>
              <div>
                <label className="label" htmlFor="w-unit">Unit</label>
                <select id="w-unit" className="input" value={d.areaUnit} onChange={(e) => set({ areaUnit: e.target.value as AreaUnit })}>
                  {(["marla", "kanal", "sqft", "sqyd", "acre", "sqm"] as AreaUnit[]).map((u) => (
                    <option key={u} value={u}>
                      {AREA_UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {rooms && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="w-beds">Bedrooms</label>
                  <select id="w-beds" className="input" value={d.beds ?? ""} onChange={(e) => set({ beds: num(e.target.value) })}>
                    <option value="">Select</option>
                    <option value="0">Studio</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                  {err("beds")}
                </div>
                <div>
                  <label className="label" htmlFor="w-baths">Bathrooms</label>
                  <select id="w-baths" className="input" value={d.baths ?? ""} onChange={(e) => set({ baths: num(e.target.value) })}>
                    <option value="">Select</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="w-park">Parking spaces</label>
                  <input id="w-park" type="number" min={0} max={50} className="input" value={d.parkingSpaces ?? ""} onChange={(e) => set({ parkingSpaces: num(e.target.value) })} />
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {!isAptLike && info?.category !== "plot" && info?.category !== "agricultural" && (
                <div>
                  <label className="label" htmlFor="w-floors">Floors</label>
                  <input id="w-floors" type="number" min={0} max={100} className="input" value={d.floors ?? ""} onChange={(e) => set({ floors: num(e.target.value) })} />
                </div>
              )}
              {isAptLike && (
                <div>
                  <label className="label" htmlFor="w-floorno">Floor number</label>
                  <input id="w-floorno" type="number" min={-3} max={150} className="input" value={d.floorNumber ?? ""} onChange={(e) => set({ floorNumber: num(e.target.value) })} />
                </div>
              )}
              {info?.category !== "plot" && info?.category !== "agricultural" && (
                <>
                  <div>
                    <label className="label" htmlFor="w-year">Year built</label>
                    <input id="w-year" type="number" min={1900} max={2100} className="input" value={d.yearBuilt ?? ""} onChange={(e) => set({ yearBuilt: num(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="w-cond">Condition</label>
                    <select id="w-cond" className="input" value={d.condition ?? ""} onChange={(e) => set({ condition: e.target.value || null })}>
                      <option value="">Select</option>
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {rooms && (
                <div>
                  <label className="label" htmlFor="w-furn">Furnishing</label>
                  <select id="w-furn" className="input" value={d.furnishing ?? ""} onChange={(e) => set({ furnishing: e.target.value || null })}>
                    <option value="">Select</option>
                    {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mt-5 space-y-5">
            {Object.entries(
              FEATURES.filter((f) => f.key !== "installments").reduce<Record<string, (typeof FEATURES)[number][]>>((acc, f) => ((acc[f.group] ??= []).push(f), acc), {}),
            ).map(([g, list]) => (
              <div key={g}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{FEATURE_GROUP_LABELS[g]}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((f) => (
                    <button key={f.key} onClick={() => set({ features: d.features.includes(f.key) ? d.features.filter((x) => x !== f.key) : [...d.features, f.key] })} className={`chip text-xs ${d.features.includes(f.key) ? "chip-active" : ""}`}>
                      {d.features.includes(f.key) && <Check className="h-3 w-3" />} {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 6 && <MediaStep media={d.media} onChange={(media) => set({ media })} error={errors.images} />}

        {step === 7 && (
          <div className="mt-5 space-y-4">
            <div>
              <label className="label" htmlFor="w-video">Video link (YouTube or Vimeo)</label>
              <input id="w-video" className="input" placeholder="https://www.youtube.com/watch?v=…" value={d.videoUrl} onChange={(e) => set({ videoUrl: e.target.value.trim() })} />
              {err("videoUrl")}
            </div>
            <div>
              <label className="label" htmlFor="w-tour">360° virtual tour link (optional)</label>
              <input id="w-tour" className="input" placeholder="https://my.matterport.com/show/?m=…" value={d.tourUrl} onChange={(e) => set({ tourUrl: e.target.value.trim() })} />
              {err("tourUrl")}
            </div>
            <p className="text-sm text-slate-500">Video walkthroughs are shown in a dedicated tab on your listing. Listings with video receive a video badge in search.</p>
          </div>
        )}

        {step === 8 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="w-cn">Contact name</label>
              <input id="w-cn" className="input" value={d.contactName} onChange={(e) => set({ contactName: e.target.value })} />
              {err("contactName")}
            </div>
            <div>
              <label className="label" htmlFor="w-cp">Mobile number</label>
              <input id="w-cp" className="input" placeholder="0300 1234567" value={d.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
              {err("contactPhone")}
            </div>
            <div>
              <label className="label" htmlFor="w-cw">WhatsApp (optional)</label>
              <input id="w-cw" className="input" value={d.contactWhatsapp} onChange={(e) => set({ contactWhatsapp: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="w-ce">Email (optional)</label>
              <input id="w-ce" type="email" className="input" value={d.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
            </div>
            <p className="text-xs text-slate-500 sm:col-span-2">Your number is shown only when a buyer taps “Call”. Verify it in Account → Security to earn the phone-verified badge.</p>
          </div>
        )}

        {step === 9 && (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-50 to-gold-50 p-4">
              <p className="text-sm text-slate-700">
                <b>AI Assist</b> drafts your title, description and highlights from the details you entered. It never adds facts you didn't provide.
              </p>
              <button onClick={aiWrite} disabled={aiBusy} className="btn-primary">
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {d.title ? "Rewrite" : "Write it for me"}
              </button>
            </div>
            <div>
              <label className="label" htmlFor="w-title">Title</label>
              <input id="w-title" className="input" maxLength={120} value={d.title} onChange={(e) => set({ title: e.target.value })} />
              <p className="mt-1 text-right text-xs text-slate-400">{d.title.length}/120</p>
              {err("title")}
            </div>
            <div>
              <label className="label" htmlFor="w-desc">Description</label>
              <textarea id="w-desc" className="input min-h-48" maxLength={6000} value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="Describe the layout, condition, nearby landmarks and anything a buyer should know." />
              {err("description")}
            </div>
            <div>
              <label className="label" htmlFor="w-hl">Highlights (one per line, max 8)</label>
              <textarea id="w-hl" className="input min-h-20" value={d.highlights.join("\n")} onChange={(e) => set({ highlights: e.target.value.split("\n").slice(0, 8) })} />
            </div>
            {missing.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> Improve your listing
                </p>
                <ul className="space-y-1 text-sm text-amber-900">
                  {missing.map((m) => (
                    <li key={m.field + m.message}>
                      {m.severity === "required" ? "● " : "○ "}
                      {m.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="label">Preview</p>
              <div className="card max-w-sm overflow-hidden">
                {d.media[0] && <img src={d.media.find((m) => m.kind === "image")?.url} alt="" className="aspect-[4/3] w-full object-cover" />}
                <div className="p-4">
                  <p className="text-xl font-extrabold">{d.price ? `${formatPKR(d.price)}${d.purpose === "rent" ? "/mo" : ""}` : "—"}</p>
                  <p className="mt-1 font-semibold text-slate-800">{d.title || "Your title"}</p>
                  <p className="text-sm text-slate-500">{[blockName, locationName, city?.name].filter(Boolean).join(", ")}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {d.beds != null && `${d.beds === 0 ? "Studio" : `${d.beds} beds`} · `}
                    {d.baths != null && `${d.baths} baths · `}
                    {d.areaValue ? formatArea(d.areaValue, d.areaUnit) : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="mt-5 space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["Purpose", d.purpose === "sale" ? "For sale" : "For rent"],
                ["Type", info?.label ?? "—"],
                ["Location", [blockName, locationName, city?.name].filter(Boolean).join(", ")],
                ["Price", d.price ? formatPKR(d.price) : "—"],
                ["Area", d.areaValue ? formatArea(d.areaValue, d.areaUnit) : "—"],
                ["Photos", String(d.media.filter((m) => m.kind === "image").length)],
                ["Amenities", String(d.features.length)],
                ["Contact", `${d.contactName} · ${d.contactPhone}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-4 py-3">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-slate-600">
              By submitting you confirm you are the owner or authorised to advertise this property, and that the information is accurate. Listings are checked by our moderators and automated fraud filters before going live.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={() => save(true)} disabled={busy} className="btn-primary flex-1 py-3">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit listing
              </button>
              <button onClick={() => save(false)} disabled={busy} className="btn-outline py-3">
                Save as draft
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-outline">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {step < STEPS.length - 1 && (
          <button onClick={next} className="btn-primary">
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function PinMap({ center, pin, onPick }: { center: [number, number]; pin: [number, number] | null; onPick: (lat: number, lng: number) => void }) {
  const cb = useRef(onPick);
  cb.current = onPick;
  const markers: MapMarker[] = pin ? [{ lat: pin[0], lng: pin[1], title: "Property" }] : [];
  return <LeafletMap key={center.join(",")} center={center} zoom={14} markers={markers} className="h-72 w-full" onReady={(m) => m.on("click", (e) => cb.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)))} />;
}

function MediaStep({ media, onChange, error }: { media: Media[]; onChange: (m: Media[]) => void; error?: string }) {
  const [uploading, setUploading] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const planInput = useRef<HTMLInputElement>(null);
  const upload = async (files: FileList | null, kind: "image" | "floor_plan") => {
    if (!files?.length) return;
    const list = [...files].slice(0, 30 - media.length);
    setUploading(list.length);
    const added: Media[] = [];
    for (const f of list) {
      const form = new FormData();
      form.append("file", f);
      form.append("kind", kind);
      try {
        const r = await api<{ id: string; url: string; kind: "image" | "floor_plan" }>("/api/v1/media", { form });
        added.push({ id: r.id, url: r.url, kind });
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, "error");
      }
      setUploading((n) => n - 1);
    }
    onChange([...media, ...added]);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const copy = [...media];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  return (
    <div className="mt-5 space-y-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files, "image");
        }}
        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center"
      >
        <ImagePlus className="h-10 w-10 text-slate-400" />
        <p className="mt-2 font-semibold">Drag photos here or</p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => input.current?.click()} className="btn-primary" type="button">
            <Upload className="h-4 w-4" /> Upload photos
          </button>
          <button onClick={() => planInput.current?.click()} className="btn-outline" type="button">
            Add floor plan
          </button>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => upload(e.target.files, "image")} />
        <input ref={planInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files, "floor_plan")} />
        <p className="mt-3 text-xs text-slate-500">JPG, PNG or WebP · up to 12 MB each · min 300×200 · up to 30 photos. Location data in photos is removed automatically.</p>
        {uploading > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-brand-700">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading {uploading}…
          </p>
        )}
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {media.map((m, i) => (
            <li key={m.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
              <img src={m.url} alt="" className="aspect-[4/3] w-full object-cover" />
              {i === 0 && m.kind === "image" && <span className="badge absolute left-2 top-2 bg-brand-700 text-white">Cover</span>}
              {m.kind === "floor_plan" && <span className="badge absolute left-2 top-2 bg-slate-900 text-white">Floor plan</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1.5 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                <span className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="rounded bg-white/90 p-1" aria-label="Move left">
                    <ArrowUp className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded bg-white/90 p-1" aria-label="Move right">
                    <ArrowDown className="h-3.5 w-3.5 -rotate-90" />
                  </button>
                </span>
                <button type="button" onClick={() => onChange(media.filter((x) => x.id !== m.id))} className="rounded bg-white/90 p-1 text-red-600" aria-label="Remove photo">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
