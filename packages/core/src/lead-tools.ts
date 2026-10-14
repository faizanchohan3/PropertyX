/**
 * Leads beyond listing enquiries:
 *  - tool leads: visitors on the calculators / valuation tool ask the site team for help
 *    (mortgage advice, selling, quotes). They have no lister, so they land in Admin → Leads.
 *  - forwarding: every new lead can be POSTed to a webhook (Zapier, Make, Google Sheets, HubSpot…).
 *  - CSV export for spreadsheets and CRMs.
 */
import { createHmac } from "node:crypto";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { notify } from "@propertyx/notifications";
import { rateLimit } from "@propertyx/auth";
import { qualifyLead } from "@propertyx/ai";
import { toolLeadInputSchema, toolLeadSource, TOOL_LEAD_LABELS, COUNTRY, publicAppUrl } from "@propertyx/shared";
import { badRequest, tooMany, type Actor } from "./errors";
import { getSetting } from "./settings";

/* ------------------------------------------------------------------ */
/* Tool leads                                                           */
/* ------------------------------------------------------------------ */

const TEAM_ROLES = ["super_admin", "admin", "support"];

export async function createToolLead(db: Database, actor: Actor | null, raw: unknown, meta: { ip?: string | null } = {}) {
  const parsed = toolLeadInputSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Please check your details", parsed.error.flatten());
  const input = parsed.data;
  const rl = await rateLimit(db, `toollead:${actor?.id ?? meta.ip ?? "anon"}`, 10, 3600);
  if (!rl.ok) throw tooMany("You've sent several requests recently. Please try again later.");

  const source = toolLeadSource(input.tool);
  const label = TOOL_LEAD_LABELS[input.tool];
  // the same person pressing the button twice: keep one lead
  const [dup] = await db
    .select({ id: s.leads.id })
    .from(s.leads)
    .where(and(eq(s.leads.phone, input.phone), eq(s.leads.source, source), gt(s.leads.createdAt, new Date(Date.now() - 30 * 60_000))))
    .limit(1);
  if (dup) return { id: dup.id, duplicate: true };

  const lines = Object.entries(input.context)
    .slice(0, 20)
    .map(([k, v]) => `${k}: ${typeof v === "number" ? v.toLocaleString(COUNTRY.locale) : v}`);
  const message = [input.message, `— From the ${label} —${lines.length ? "\n" + lines.join("\n") : ""}`].filter(Boolean).join("\n\n");
  const q = qualifyLead({ message: input.message, source, phoneVerified: !!actor?.phoneVerified, hasAccount: !!actor, previousEnquiries: 0, savedListing: false });

  const [lead] = await db
    .insert(s.leads)
    .values({ recipientId: null, userId: actor?.id ?? null, name: input.name, phone: input.phone, email: input.email || null, message, source, aiScore: q.score, aiSummary: q.summary })
    .returning();

  const team = await db
    .selectDistinct({ id: s.users.id })
    .from(s.users)
    .innerJoin(s.userRoles, eq(s.userRoles.userId, s.users.id))
    .innerJoin(s.roles, eq(s.roles.id, s.userRoles.roleId))
    .where(and(inArray(s.roles.key, TEAM_ROLES), eq(s.users.status, "active")))
    .limit(25);
  for (const t of team) {
    await notify(db, {
      userId: t.id,
      type: "new_lead",
      title: source === "mortgage" ? "New mortgage lead" : source === "valuation" ? "New valuation lead" : "New tool lead",
      body: `${input.name} asked for help from the ${label}.`,
      link: "/admin/leads",
      data: { leadId: lead.id },
    }).catch(() => null);
  }
  await forwardLead(db, lead.id);
  return { id: lead.id, duplicate: false };
}

/* ------------------------------------------------------------------ */
/* Forwarding to other tools                                            */
/* ------------------------------------------------------------------ */

export interface LeadWebhookSetting {
  url?: string;
  secret?: string;
  enabled?: boolean;
}

export async function leadWebhookConfig(db: Database): Promise<{ url: string; secret: string | null } | null> {
  const st = await getSetting<LeadWebhookSetting>(db, "lead_webhook").catch(() => undefined);
  if (st && st.enabled === false) return null;
  const url = st?.url?.trim() || process.env.LEADS_WEBHOOK_URL?.trim();
  // https only in production; plain http is allowed locally for testing
  if (!url || !(/^https:\/\//i.test(url) || (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)[:/]/i.test(url)))) return null;
  return { url, secret: st?.secret?.trim() || process.env.LEADS_WEBHOOK_SECRET?.trim() || null };
}

const SOURCE_LABELS: Record<string, string> = {
  form: "Enquiry form",
  call: "Call button",
  whatsapp: "WhatsApp button",
  chat: "Chat",
  visit: "Visit request",
  offer: "Offer",
  payment_plan: "Payment plan request",
  brochure: "Brochure download",
  ai_assistant: "AI assistant",
  mortgage: "Mortgage calculator",
  valuation: "Property valuation",
  tool: "Calculator",
};

async function leadRows(db: Database, where: ReturnType<typeof sql>) {
  return db.execute<Record<string, unknown>>(sql`
    select ld.*, l.title as listing_title, l.slug as listing_slug, l.price as listing_price, pr.name as project_name, pr.slug as project_slug,
      ru.name as recipient_name, ru.email as recipient_email
    from leads ld
    left join property_listings l on l.id = ld.listing_id
    left join projects pr on pr.id = ld.project_id
    left join users ru on ru.id = ld.recipient_id
    where ${where}
    order by ld.created_at desc limit 5000`);
}

/** One flat record per lead: the shape the webhook sends and the CSV export uses. */
function flatLead(r: Record<string, unknown>) {
  const app = publicAppUrl();
  return {
    id: r.id as string,
    created_at: new Date(r.created_at as string).toISOString(),
    site: COUNTRY.code,
    name: r.name as string,
    phone: (r.phone as string) || "",
    email: (r.email as string) || "",
    message: (r.message as string) || "",
    source: r.source as string,
    source_label: SOURCE_LABELS[r.source as string] ?? (r.source as string),
    status: r.status as string,
    score: r.ai_score != null ? Number(r.ai_score) : null,
    summary: (r.ai_summary as string) || "",
    offer_amount: r.offer_amount != null ? Number(r.offer_amount) : null,
    listing_title: (r.listing_title as string) || "",
    listing_url: r.listing_slug ? `${app}/property/${r.listing_slug}` : "",
    listing_price: r.listing_price != null ? Number(r.listing_price) : null,
    project_name: (r.project_name as string) || "",
    project_url: r.project_slug ? `${app}/project/${r.project_slug}` : "",
    recipient_name: (r.recipient_name as string) || (r.recipient_id ? "" : "Site team"),
    recipient_email: (r.recipient_email as string) || "",
    currency: COUNTRY.currency,
    demo: !!r.is_seed,
  };
}
export type FlatLead = ReturnType<typeof flatLead>;

/** POSTs the lead to the configured webhook. Never throws: a down CRM must not lose the enquiry. */
export async function forwardLead(db: Database, leadId: string, event = "lead.created"): Promise<{ sent: boolean; status?: number; error?: string }> {
  try {
    const hook = await leadWebhookConfig(db);
    if (!hook) return { sent: false };
    const [row] = await leadRows(db, sql`ld.id = ${leadId}`);
    if (!row) return { sent: false };
    return await postWebhook(hook, { event, ...flatLead(row) });
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}

async function postWebhook(hook: { url: string; secret: string | null }, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "Bismillah-Leads/1.0" };
  if (hook.secret) headers["x-bismillah-signature"] = "sha256=" + createHmac("sha256", hook.secret).update(body).digest("hex");
  try {
    const res = await fetch(hook.url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000), redirect: "follow" });
    return { sent: res.ok, status: res.status, error: res.ok ? undefined : `The tool answered ${res.status}` };
  } catch (e) {
    return { sent: false, error: (e as Error).name === "TimeoutError" ? "No answer within 5 seconds" : (e as Error).message };
  }
}

/** Admin "Send test lead" button. */
export async function testLeadWebhook(db: Database, actor: Actor | null) {
  if (!actor?.permissions.includes("settings.manage")) throw badRequest("Only admins can test the webhook");
  const hook = await leadWebhookConfig(db);
  if (!hook) throw badRequest("Add an https:// webhook URL first");
  return postWebhook(hook, {
    event: "lead.test",
    id: "00000000-0000-0000-0000-000000000000",
    created_at: new Date().toISOString(),
    site: COUNTRY.code,
    name: "Test lead",
    phone: COUNTRY.phone.example,
    email: "test@example.com",
    message: "This is a test lead from Bismillah. You can delete it.",
    source: "form",
    source_label: "Enquiry form",
    status: "new",
    score: 50,
    summary: "Test",
    currency: COUNTRY.currency,
    demo: true,
  });
}

/* ------------------------------------------------------------------ */
/* CSV export                                                           */
/* ------------------------------------------------------------------ */

const CSV_COLUMNS: (keyof FlatLead)[] = ["created_at", "name", "phone", "email", "source_label", "status", "score", "listing_title", "listing_url", "listing_price", "project_name", "offer_amount", "message", "recipient_name", "summary"];

function csvCell(v: unknown) {
  if (v == null) return "";
  let t = String(v);
  // stop spreadsheets treating a visitor's text as a formula
  if (/^[=+\-@\t\r]/.test(t) && !/^\+\d/.test(t)) t = "'" + t;
  return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** CSV of the leads the actor can see: own, agency team (admins/managers), or site-team leads (staff). */
export async function exportLeadsCsv(db: Database, actor: Actor, scope: "mine" | "team" | "platform" | "all" = "mine") {
  let where = sql`ld.recipient_id = ${actor.id}`;
  if (scope === "team") {
    const [m] = await db.select().from(s.agencyMembers).where(and(eq(s.agencyMembers.userId, actor.id), inArray(s.agencyMembers.role, ["admin", "manager"])));
    if (!m) throw badRequest("Team leads are available to agency admins and managers");
    where = sql`ld.agency_id = ${m.agencyId}`;
  } else if (scope === "platform") {
    if (!actor.permissions.includes("support.access")) throw badRequest("Site-team leads are for admins");
    where = sql`ld.recipient_id is null`;
  } else if (scope === "all") {
    if (!actor.permissions.includes("support.access")) throw badRequest("All leads are for admins");
    where = sql`true`;
  }
  const rows = (await leadRows(db, where)).map(flatLead);
  const head = CSV_COLUMNS.join(",");
  return "﻿" + [head, ...rows.map((r) => CSV_COLUMNS.map((c) => csvCell(r[c])).join(","))].join("\r\n") + "\r\n";
}
