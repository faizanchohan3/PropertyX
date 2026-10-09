import { formatPKR, type InvestmentResult } from "@propertyx/shared";
import { tryLLM, getLLM, type JsonSchema, type DocumentInput } from "./providers";

/* ------------------------------------------------------------------ */
/* Lead qualification                                                   */
/* ------------------------------------------------------------------ */

export interface LeadSignals {
  message: string;
  source: string;
  phoneVerified: boolean;
  hasAccount: boolean;
  offerAmount?: number | null;
  listingPrice?: number | null;
  previousEnquiries?: number;
  savedListing?: boolean;
  requestedVisit?: boolean;
}

export function qualifyLead(s: LeadSignals): { score: number; tier: "hot" | "warm" | "cold"; summary: string; signals: string[] } {
  let score = 30;
  const signals: string[] = [];
  const m = s.message.toLowerCase();
  if (s.phoneVerified) {
    score += 12;
    signals.push("Verified phone number");
  }
  if (s.hasAccount) score += 5;
  if (s.requestedVisit || s.source === "visit") {
    score += 18;
    signals.push("Requested a visit");
  }
  if (s.offerAmount && s.listingPrice) {
    const ratio = s.offerAmount / s.listingPrice;
    score += ratio >= 0.9 ? 20 : ratio >= 0.8 ? 10 : 2;
    signals.push(`Made an offer at ${Math.round(ratio * 100)}% of asking`);
  }
  if (/\b(cash|ready to pay|token|this week|today|tomorrow|urgent|immediately|asap)\b/.test(m)) {
    score += 10;
    signals.push("Indicates a short timeline");
  }
  if (/\b(visit|see|viewing|inspect|weekend)\b/.test(m)) {
    score += 6;
    signals.push("Wants to view the property");
  }
  if (/\b(negotiable|final price|best price|discount)\b/.test(m)) {
    score += 4;
    signals.push("Price negotiation intent");
  }
  if (/\b(installment|loan|financ)\b/.test(m)) signals.push("Asked about payment options");
  if (s.savedListing) {
    score += 5;
    signals.push("Saved this listing");
  }
  if ((s.previousEnquiries ?? 0) > 6) {
    score -= 8;
    signals.push("Many enquiries across listings");
  }
  if (m.trim().length < 12) score -= 6;
  score = Math.max(0, Math.min(100, score));
  const tier = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";
  const summary = `${tier === "hot" ? "High-intent" : tier === "warm" ? "Interested" : "Early-stage"} enquiry via ${s.source.replace("_", " ")}${signals.length ? `: ${signals.slice(0, 3).join(", ").toLowerCase()}` : ""}.`;
  return { score, tier, summary, signals };
}

/* ------------------------------------------------------------------ */
/* Customer support assistant (grounded on help articles)               */
/* ------------------------------------------------------------------ */

export const HELP_ARTICLES = [
  { id: "post", title: "How do I post a property?", keywords: ["post", "list", "add property", "sell", "advertise", "listing"], body: "Click “Post Property” in the top bar. The 11-step wizard asks for purpose, type, location, price, details, amenities, photos, video and contact details, then shows a preview. Listings go to Pending Review and our moderators usually approve them within a few hours. You can use AI Assist in the wizard to draft the title and description." },
  { id: "verify", title: "How do I get verified?", keywords: ["verify", "verified", "verification", "badge", "cnic", "documents"], body: "Go to Dashboard → Verification. Verify your phone first (Level 1), then upload your CNIC for identity verification (Level 2). For a listing, upload ownership documents (Level 3); our team reviews them and confirms the location (Level 4). Premium Verified (Level 5) includes a physical inspection. Documents are stored privately and only visible to our verification team." },
  { id: "fraud", title: "How do I report a suspicious listing or agent?", keywords: ["report", "fraud", "scam", "fake", "suspicious"], body: "Use the “Report” button on any listing or agent profile. Choose a reason and add details. Our Trust & Safety team reviews every report. Never pay token money before verifying documents and meeting the owner; never pay into a personal account that doesn't match the owner's name." },
  { id: "payments", title: "Which payment methods are supported?", keywords: ["pay", "payment", "jazzcash", "easypaisa", "card", "invoice", "refund"], body: "Subscriptions, featured listings and advertising can be paid through the payment gateways enabled for your account, such as JazzCash, Easypaisa or card payments. You can download invoices under Dashboard → Billing. For refunds contact support with your invoice number." },
  { id: "plans", title: "What do the subscription plans include?", keywords: ["plan", "subscription", "pro", "agency", "developer", "enterprise", "price", "quota", "featured"], body: "Free includes 3 active listings. Agent Pro adds 50 listings, 5 featured listings a month, lead management and analytics. Agency adds team seats, CRM and advanced analytics. Developer adds project and inventory management. Enterprise offers custom limits and API access. See the Pricing page for current prices." },
  { id: "alerts", title: "How do saved searches and alerts work?", keywords: ["alert", "saved search", "notify", "notification", "price drop"], body: "Run a search and click “Save search”. We notify you when new listings match. Saved properties trigger a price-drop alert if the price is reduced. Choose channels (in-app, email, SMS, WhatsApp, push) in Account → Notifications." },
  { id: "visit", title: "How do I book a property visit?", keywords: ["visit", "viewing", "appointment", "schedule", "book"], body: "On a property page click “Request Visit”, pick a date, time and number of visitors. The agent or owner confirms or suggests another time. Track requests in Dashboard → Appointments." },
  { id: "account", title: "How do I change my password or delete my account?", keywords: ["password", "account", "delete", "email", "login", "sign in"], body: "Go to Account → Security to change your password and sign out of other devices. To close your account, contact support from the Help page; we'll confirm by email before deleting." },
  { id: "rent", title: "How does rent collection work?", keywords: ["rent", "tenant", "landlord", "lease", "reminder", "maintenance"], body: "Landlords add properties, units and leases under Dashboard → Rentals. Monthly rent dues are generated automatically and reminders are sent before the due date. Tenants invited by email get a portal to see their lease, payment history and to raise maintenance requests." },
];

export async function answerSupport(question: string): Promise<{ answer: string; articles: { id: string; title: string }[]; source: string }> {
  const q = question.toLowerCase();
  const scored = HELP_ARTICLES.map((a) => ({ a, s: a.keywords.reduce((t, k) => t + (q.includes(k) ? (k.includes(" ") ? 3 : 2) : 0), 0) + (q.includes(a.title.toLowerCase().slice(7, 20)) ? 2 : 0) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, 3)
    .map((x) => x.a);
  const articles = scored.map((a) => ({ id: a.id, title: a.title }));
  if (!scored.length) {
    return { answer: "I couldn't find a help article for that. You can contact our support team from the Help page and a person will get back to you.", articles: [], source: "rules" };
  }
  const llm = await tryLLM((p) =>
    p.generateText({
      effort: "low",
      maxTokens: 1500,
      system: "You are Bismillah customer support. Answer ONLY using the help articles provided. If they don't cover the question, say you'll connect the user with a human agent. Keep answers under 120 words.",
      prompt: `Help articles:\n${scored.map((a) => `## ${a.title}\n${a.body}`).join("\n\n")}\n\nQuestion: ${question}`,
    }),
  );
  return { answer: llm?.trim() || scored[0].body, articles, source: llm ? "llm" : "rules" };
}

/* ------------------------------------------------------------------ */
/* Area assistant (grounded on platform statistics)                     */
/* ------------------------------------------------------------------ */

export interface AreaFacts {
  name: string;
  cityName: string;
  overview: string | null;
  activeListings: number;
  medianSalePricePerSqft: number | null;
  medianRent: number | null;
  priceChange12m: number | null;
  topTypes: { type: string; count: number }[];
  isDemoData: boolean;
}

export async function answerAreaQuestion(facts: AreaFacts, question: string): Promise<{ answer: string; source: string }> {
  const basics = [
    facts.overview ?? "",
    `There are currently ${facts.activeListings} active listings in ${facts.name}.`,
    facts.medianSalePricePerSqft ? `The median asking price of listed properties is about PKR ${Math.round(facts.medianSalePricePerSqft).toLocaleString("en-PK")} per sq ft.` : "",
    facts.medianRent ? `The median asking rent of listed homes is about ${formatPKR(facts.medianRent)} per month.` : "",
    facts.priceChange12m != null ? `Average asking price per sq ft has changed by ${facts.priceChange12m.toFixed(1)}% over the last 12 months on Bismillah.` : "",
    facts.isDemoData ? "(Figures are calculated from demo listings on this environment.)" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const llm = await tryLLM((p) =>
    p.generateText({
      effort: "low",
      maxTokens: 1500,
      system: "You answer questions about a Pakistani neighbourhood using ONLY the facts given. Do not invent schools, landmarks, prices, crime figures or future developments. If the facts don't answer the question, say so and suggest checking with local agents. Under 150 words.",
      prompt: `Facts about ${facts.name}, ${facts.cityName}:\n${basics}\nMost listed types: ${facts.topTypes.map((t) => `${t.type} (${t.count})`).join(", ")}\n\nQuestion: ${question}`,
    }),
  );
  return { answer: llm?.trim() || basics, source: llm ? "llm" : "rules" };
}

/* ------------------------------------------------------------------ */
/* Investment narrative                                                 */
/* ------------------------------------------------------------------ */

export function investmentNarrative(r: InvestmentResult, years: number): string {
  const lines = [
    `Estimated grade: ${r.grade} (${r.score}/100).`,
    `Gross rental yield ${r.grossRentalYield.toFixed(1)}%, net ${r.netRentalYield.toFixed(1)}%.`,
    `Over ${years} year${years > 1 ? "s" : ""} the projected total return is ${formatPKR(r.totalReturn)} on ${formatPKR(r.cashInvested)} invested (${r.roi.toFixed(0)}% ROI, ${r.annualisedReturn.toFixed(1)}% a year).`,
    r.breakEvenYears != null ? `Break-even after costs in about ${r.breakEvenYears} year${r.breakEvenYears > 1 ? "s" : ""}.` : "Break-even is not reached within 30 years under these assumptions.",
    ...r.factors.filter((f) => f.impact !== "neutral").map((f) => `${f.impact === "positive" ? "+" : "–"} ${f.detail}`),
    "These are estimates based on your assumptions, not financial advice.",
  ];
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Document extraction (verification support)                           */
/* ------------------------------------------------------------------ */

const DOC_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    documentType: { type: "string", enum: ["cnic", "registry", "fard", "allotment_letter", "transfer_letter", "noc", "rental_agreement", "utility_bill", "other"] },
    holderName: { type: ["string", "null"] },
    idNumberLast4: { type: ["string", "null"] },
    propertyReference: { type: ["string", "null"] },
    society: { type: ["string", "null"] },
    issueDate: { type: ["string", "null"] },
    legible: { type: "boolean" },
    notes: { type: "string" },
  },
  required: ["documentType", "holderName", "idNumberLast4", "propertyReference", "society", "issueDate", "legible", "notes"],
  additionalProperties: false,
};

export type ExtractedDocument = {
  documentType: string;
  holderName: string | null;
  idNumberLast4: string | null;
  propertyReference: string | null;
  society: string | null;
  issueDate: string | null;
  legible: boolean;
  notes: string;
};

/** Assists human verifiers; the result is advisory and never auto-approves anything. */
export async function extractDocument(doc: DocumentInput): Promise<ExtractedDocument | null> {
  const llm = getLLM();
  if (!llm?.readDocument) return null;
  try {
    return await llm.readDocument<ExtractedDocument>({
      schema: DOC_SCHEMA,
      schemaName: "document_fields",
      document: doc,
      effort: "low",
      maxTokens: 2000,
      system: "You assist a property verification officer in Pakistan. Extract only what is clearly printed on the document. For any ID number return only the last 4 digits. If unreadable, set legible=false. Never guess.",
      prompt: "Extract the document fields.",
    });
  } catch (e) {
    console.warn("[ai] document extraction failed:", (e as Error).message);
    return null;
  }
}
