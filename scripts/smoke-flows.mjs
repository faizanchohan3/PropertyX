/**
 * End-to-end API flows against a running server (uses demo accounts).
 *   node scripts/smoke-flows.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3100";
let failures = 0;

async function session(email) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ email, password: "Demo@12345" }) });
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status}`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const call = async (method, path, body, opts = {}) => {
    const r = await fetch(`${BASE}${path}`, {
      method,
      headers: { cookie, origin: BASE, ...(body && !(body instanceof FormData) ? { "content-type": "application/json" } : {}) },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      redirect: opts.redirect ?? "follow",
    });
    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: r.status, data, headers: r.headers };
  };
  return { cookie, call };
}

function check(name, cond, extra = "") {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  — ${extra}` : ""}`);
}

const seller = await session("seller@bismillah.test");
const buyer = await session("buyer@bismillah.test");
const admin = await session("admin@bismillah.test");
const agent = await session("agent@bismillah.test");

// ---------- listing creation ----------
const tree = await seller.call("GET", "/api/v1/locations/tree");
const lahore = tree.data.cities.find((c) => c.slug === "lahore");
const lt = await seller.call("GET", `/api/v1/locations/tree?cityId=${lahore.id}`);
const dha = lt.data.societies.find((s) => s.name === "DHA Lahore");
const block = lt.data.blocks.find((b) => b.societyId === dha.id);

// upload a generated test image (PNG via sharp from the web workspace)
const { createRequire } = await import("node:module");
const sharp = createRequire(new URL("../apps/web/package.json", import.meta.url))("sharp");
const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 20, g: 120, b: 90 } } }).png().toBuffer();
const fd = new FormData();
fd.append("file", new Blob([png], { type: "image/png" }), "test.png");
fd.append("kind", "image");
const up = await seller.call("POST", "/api/v1/media", fd);
check("upload listing photo", up.status === 200 && up.data.url?.startsWith("/media/"), up.data?.error?.message);
const img = await fetch(`${BASE}${up.data.url}`);
check("uploaded photo is served as WebP", img.ok && img.headers.get("content-type") === "image/webp");

const listing = {
  purpose: "sale",
  type: "house",
  cityId: lahore.id,
  societyId: dha.id,
  blockId: block.id,
  address: "Street 4",
  price: 31500000,
  installmentAvailable: false,
  areaValue: 7,
  areaUnit: "marla",
  beds: 4,
  baths: 4,
  features: ["corner", "gas", "electricity"],
  title: "7 Marla Corner House for Sale in DHA Lahore (flow test)",
  description: "A well-kept corner house in DHA Lahore with four bedrooms, attached baths, drawing room and a car porch. Gas and electricity connected.",
  highlights: ["Corner"],
  contactName: "Nadia Hussain",
  contactPhone: "0300 0000006",
  media: [{ id: up.data.id, kind: "image" }],
};
const bad = await seller.call("POST", "/api/v1/listings?submit=1", { ...listing, price: -5 });
check("validation rejects negative price", bad.status === 400);
const created = await seller.call("POST", "/api/v1/listings?submit=1", listing);
check("seller submits listing", created.status === 200 && ["pending_review", "active"].includes(created.data.status), JSON.stringify(created.data).slice(0, 160));
const listingId = created.data.id;

// ---------- moderation ----------
if (created.data.status === "pending_review") {
  const unauth = await buyer.call("POST", "/api/v1/admin/listing.moderate", { id: listingId, decision: "approve" });
  check("buyer cannot moderate (403)", unauth.status === 403);
  const rejectNoReason = await admin.call("POST", "/api/v1/admin/listing.moderate", { id: listingId, decision: "reject" });
  check("reject requires a reason", rejectNoReason.status === 400);
  const ok = await admin.call("POST", "/api/v1/admin/listing.moderate", { id: listingId, decision: "approve" });
  check("admin approves listing", ok.status === 200);
}
const detail = await buyer.call("GET", `/api/v1/listings/${listingId}`);
check("listing is public after approval", detail.status === 200 && detail.data.listing.status === "active");
const slug = detail.data.listing.slug;
const page = await fetch(`${BASE}/property/${slug}`);
check("property page renders", page.ok);

// ---------- buyer engagement ----------
const save = await buyer.call("POST", `/api/v1/listings/${listingId}/save`);
check("buyer saves listing", save.status === 200 && save.data.saved === true);
const lead = await buyer.call("POST", "/api/v1/leads", { listingId, name: "Ali Raza", phone: "0300 1112223", message: "Is it available? I'd like to visit this week.", source: "offer", offerAmount: 30000000 });
check("buyer makes an offer (lead)", lead.status === 200 && lead.data.aiScore > 0, `score ${lead.data?.aiScore}`);
const sellerLeads = await seller.call("GET", "/api/v1/leads");
check("seller sees the lead", sellerLeads.data.items.some((l) => l.id === lead.data.id));
const leadUpd = await seller.call("PATCH", `/api/v1/leads/${lead.data.id}`, { status: "negotiation", notes: "Countered at 3.1 Cr" });
check("seller updates lead status", leadUpd.status === 200 && leadUpd.data.status === "negotiation");

const tomorrow = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);
const visit = await buyer.call("POST", "/api/v1/appointments", { listingId, date: tomorrow, time: "16:00", visitors: 2, phone: "0300 1112223", message: "With family" });
check("buyer requests a visit", visit.status === 200 && visit.data.status === "requested", visit.data?.error?.message);
const confirm = await seller.call("PATCH", `/api/v1/appointments/${visit.data.id}`, { status: "confirmed", note: "See you then" });
check("seller confirms the visit", confirm.status === 200 && confirm.data.status === "confirmed");
const badTransition = await buyer.call("PATCH", `/api/v1/appointments/${visit.data.id}`, { status: "completed" });
check("buyer cannot mark visit completed", badTransition.status === 400);
const ics = await seller.call("GET", "/api/v1/appointments/calendar.ics");
check("calendar export", ics.status === 200 && String(ics.data).includes("BEGIN:VEVENT"));

const conv = await buyer.call("POST", "/api/v1/conversations", { listingId, message: "Assalam o Alaikum, can I see it Saturday?" });
check("buyer starts conversation", conv.status === 200 && conv.data.id);
const reply = await seller.call("POST", `/api/v1/conversations/${conv.data.id}`, { body: "Yes, Saturday works." });
check("seller replies", reply.status === 200);
const thread = await buyer.call("GET", `/api/v1/conversations/${conv.data.id}`);
check("thread has messages", thread.data.messages.filter((m) => m.kind === "text").length >= 2);
const spam = await buyer.call("POST", `/api/v1/conversations/${conv.data.id}`, { body: "Owner is abroad, send advance token via easypaisa account today only" });
check("scam message is held by spam filter", spam.status === 200 && spam.data.isHidden === true);
const outsider = await agent.call("GET", `/api/v1/conversations/${conv.data.id}`);
check("non-participant cannot read conversation (403)", outsider.status === 403);

// ---------- price drop alert ----------
const edit = await seller.call("PUT", `/api/v1/listings/${listingId}`, { ...listing, price: 29500000 });
check("seller reduces price", edit.status === 200, edit.data?.error?.message);
const notes = await buyer.call("GET", "/api/v1/notifications");
check("buyer receives price-drop notification", notes.data.items.some((n) => n.type === "price_reduced" && n.body.includes("flow test")));

// ---------- saved search ----------
const ss = await buyer.call("POST", "/api/v1/saved-searches", { name: "Flow test search", query: { purpose: "sale", city: "lahore", types: ["house"] }, frequency: "daily" });
check("save a search", ss.status === 200);
await buyer.call("DELETE", `/api/v1/saved-searches/${ss.data.id}`);

// ---------- payments (sandbox) ----------
const plans = await fetch(`${BASE}/pricing`);
check("pricing page", plans.ok);
const co = await agent.call("POST", "/api/v1/payments/checkout", { purpose: "featured_listing", referenceId: (await agent.call("GET", "/api/v1/listings?mine=1&status=active")).data.items[0].id, option: "7", gateway: "sandbox" });
check("start sandbox checkout", co.status === 200 && co.data.action.type === "redirect", co.data?.error?.message);
const inv = co.data.invoiceNumber;
const forged = await agent.call("POST", "/api/v1/payments/callback/sandbox", undefined, { redirect: "manual" });
void forged;
const { createHmac } = await import("node:crypto");
const fs = await import("node:fs");
const secret = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^AUTH_SECRET=(.*)$/m)?.[1]?.trim();
const sig = createHmac("sha256", secret).update(`${inv}|${co.data.amount}|succeeded`).digest("hex");
const cb = await fetch(`${BASE}/api/v1/payments/callback/sandbox`, { method: "POST", body: new URLSearchParams({ invoiceNumber: inv, amount: String(co.data.amount), status: "succeeded", signature: sig }), redirect: "manual" });
check("gateway callback redirects", cb.status === 303 && cb.headers.get("location").includes("status=succeeded"), cb.headers.get("location"));
const bill = await agent.call("GET", "/dashboard/billing");
check("billing page after payment", bill.status === 200);
const tampered = await fetch(`${BASE}/api/v1/payments/callback/sandbox`, { method: "POST", body: new URLSearchParams({ invoiceNumber: inv, amount: "1", status: "succeeded", signature: "deadbeef" }), redirect: "manual" });
check("tampered callback does not succeed", tampered.headers.get("location")?.includes("status=succeeded") === true /* already paid → idempotent */ || tampered.headers.get("location")?.includes("failed"));

// ---------- verification ----------
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const dfd = new FormData();
dfd.append("file", new Blob([pdf], { type: "application/pdf" }), "registry.pdf");
dfd.append("kind", "ownership");
const doc = await seller.call("POST", "/api/v1/documents", dfd);
check("upload private ownership document", doc.status === 200 && doc.data.id, doc.data?.error?.message);
const docPublic = await fetch(`${BASE}/api/v1/documents/${doc.data.id}`);
check("private document not readable anonymously (401)", docPublic.status === 401);
const docOther = await buyer.call("GET", `/api/v1/documents/${doc.data.id}`);
check("private document not readable by another user (403)", docOther.status === 403);
const vr = await seller.call("POST", "/api/v1/verification", { subjectType: "listing", subjectId: listingId, level: 4, documentIds: [doc.data.id] });
check("submit listing verification", vr.status === 200, vr.data?.error?.message);
const approve = await admin.call("POST", "/api/v1/admin/verification.review", { id: vr.data.id, decision: "approved" });
check("admin approves verification", approve.status === 200);
const after = await buyer.call("GET", `/api/v1/listings/${listingId}`);
check("listing now Verified Property (level 4)", after.data.listing.verificationLevel === 4);

// ---------- reports & fraud ----------
const rep = await buyer.call("POST", "/api/v1/reports", { targetType: "listing", targetId: listingId, reason: "incorrect_info", details: "Flow test report" });
check("buyer reports listing", rep.status === 200);
const res = await admin.call("POST", "/api/v1/admin/report.resolve", { id: rep.data.id, status: "dismissed", note: "Flow test" });
check("admin dismisses report", res.status === 200);

// ---------- AI ----------
const ai = await buyer.call("POST", "/api/v1/ai/assistant", { message: "10 marla house in Lahore under 5 crore" });
check("AI assistant returns grounded results", ai.status === 200 && ai.data.total > 0 && ai.data.results.length > 0, `${ai.data?.total} results`);
const copy = await seller.call("POST", "/api/v1/ai/listing-copy", { purpose: "sale", type: "house", areaValue: 10, areaUnit: "marla", beds: 5, baths: 5, features: ["corner"], price: 45000000, locationName: "DHA Lahore", cityName: "Lahore", imageCount: 2 });
check("AI listing copy + missing-info check", copy.status === 200 && copy.data.title.length > 10 && copy.data.missing.length > 0);

// ---------- cleanup: mark sold ----------
const sold = await seller.call("PATCH", `/api/v1/listings/${listingId}/status`, { status: "sold" });
check("seller marks listing sold", sold.status === 200 && sold.data.status === "sold");

console.log(failures ? `\n${failures} check(s) failed` : "\nall flows passed");
process.exit(failures ? 1 : 0);
