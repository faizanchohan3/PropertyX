import { and, eq, gt, inArray, sql, lt } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { notify } from "@propertyx/notifications";
import { rateLimit } from "@propertyx/auth";
import { qualifyLead } from "@propertyx/ai";
import { leadInputSchema, appointmentInputSchema, messageInputSchema, leadUpdateSchema, appointmentUpdateSchema, formatPKR, LEAD_STATUSES } from "@propertyx/shared";
import { badRequest, forbidden, notFound, requireActor, tooMany, type Actor } from "./errors";
import { messageSpamScore } from "./fraud";
import { getSetting } from "./settings";

/* ------------------------------------------------------------------ */
/* Leads                                                                */
/* ------------------------------------------------------------------ */

async function listingRecipient(db: Database, listingId: string) {
  const [l] = await db.select().from(s.propertyListings).where(eq(s.propertyListings.id, listingId));
  if (!l || !["active"].includes(l.status)) throw badRequest("This listing is not accepting enquiries");
  return l;
}

export async function createLead(db: Database, actor: Actor | null, raw: unknown, meta: { ip?: string | null } = {}) {
  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Please check your details", parsed.error.flatten());
  const input = parsed.data;
  const rl = await rateLimit(db, `lead:${actor?.id ?? meta.ip ?? "anon"}`, 20, 3600);
  if (!rl.ok) throw tooMany("You've sent many enquiries recently. Please try again later.");

  let recipientId: string | null = null;
  let agencyId: string | null = null;
  let agentId: string | null = null;
  let developerId: string | null = null;
  let listingPrice: number | null = null;
  let subject = "";
  let link = "/dashboard/leads";
  if (input.listingId) {
    const l = await listingRecipient(db, input.listingId);
    if (actor && l.postedById === actor.id) throw badRequest("You can't enquire on your own listing");
    recipientId = l.postedById;
    agencyId = l.agencyId;
    agentId = l.agentId;
    listingPrice = l.price;
    subject = l.title;
  } else if (input.projectId) {
    const [p] = await db.select({ p: s.projects, ownerId: s.developers.ownerId }).from(s.projects).innerJoin(s.developers, eq(s.developers.id, s.projects.developerId)).where(eq(s.projects.id, input.projectId));
    if (!p) throw notFound("Project");
    recipientId = p.ownerId;
    developerId = p.p.developerId;
    subject = p.p.name;
  } else if (input.agentId) {
    const [a] = await db.select().from(s.agents).where(eq(s.agents.id, input.agentId));
    if (!a) throw notFound("Agent");
    recipientId = a.userId;
    agentId = a.id;
    agencyId = a.agencyId;
    subject = "your profile";
  } else throw badRequest("Missing listing, project or agent");
  if (input.source === "offer" && !input.offerAmount) throw badRequest("Enter your offer amount");

  const [prev] = actor ? await db.select({ n: sql<number>`count(*)::int` }).from(s.leads).where(and(eq(s.leads.userId, actor.id), gt(s.leads.createdAt, new Date(Date.now() - 7 * 86400_000)))) : [{ n: 0 }];
  const saved = actor && input.listingId ? (await db.select().from(s.savedProperties).where(and(eq(s.savedProperties.userId, actor.id), eq(s.savedProperties.listingId, input.listingId)))).length > 0 : false;
  const q = qualifyLead({ message: input.message, source: input.source, phoneVerified: !!actor?.phoneVerified, hasAccount: !!actor, offerAmount: input.offerAmount, listingPrice, previousEnquiries: prev?.n ?? 0, savedListing: saved });

  const [lead] = await db
    .insert(s.leads)
    .values({
      listingId: input.listingId ?? null,
      projectId: input.projectId ?? null,
      agentId,
      agencyId,
      developerId,
      recipientId,
      userId: actor?.id ?? null,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      message: input.message,
      source: input.source,
      offerAmount: input.offerAmount ?? null,
      aiScore: q.score,
      aiSummary: q.summary,
    })
    .returning();
  if (input.listingId) {
    await db.update(s.propertyListings).set({ leadsCount: sql`${s.propertyListings.leadsCount} + 1` }).where(eq(s.propertyListings.id, input.listingId));
    await db.insert(s.listingEvents).values({ listingId: input.listingId, type: "lead", userId: actor?.id ?? null });
  }
  if (input.projectId) await db.insert(s.listingEvents).values({ projectId: input.projectId, type: input.source === "brochure" ? "brochure" : "lead", userId: actor?.id ?? null });
  if (recipientId)
    await notify(db, {
      userId: recipientId,
      type: "new_lead",
      title: input.source === "offer" ? `New offer: ${formatPKR(input.offerAmount!)}` : "New lead",
      body: `${input.name} enquired about ${subject}. ${q.tier === "hot" ? "High intent." : ""}`.trim(),
      link,
      data: { leadId: lead.id },
    });
  return lead;
}

/** Leads visible to the actor: own leads, plus team leads for agency admins/managers. */
export async function listLeads(db: Database, actor: Actor, opts: { status?: string; scope?: "mine" | "team"; saved?: boolean; q?: string; listingId?: string } = {}) {
  let scope = sql`ld.recipient_id = ${actor.id}`;
  if (opts.scope === "team") {
    const [m] = await db.select().from(s.agencyMembers).where(and(eq(s.agencyMembers.userId, actor.id), inArray(s.agencyMembers.role, ["admin", "manager"])));
    if (!m) throw forbidden("Team leads are available to agency admins and managers");
    scope = sql`ld.agency_id = ${m.agencyId}`;
  }
  const rows = await db.execute<Record<string, unknown>>(sql`
    select ld.*, l.title as listing_title, l.slug as listing_slug, l.price as listing_price, pr.name as project_name, pr.slug as project_slug,
      ru.name as recipient_name
    from leads ld
    left join property_listings l on l.id = ld.listing_id
    left join projects pr on pr.id = ld.project_id
    left join users ru on ru.id = ld.recipient_id
    where ${scope}
      ${opts.status && opts.status !== "all" ? sql`and ld.status = ${opts.status}` : sql``}
      ${opts.saved ? sql`and ld.is_saved = true` : sql``}
      ${opts.listingId ? sql`and ld.listing_id = ${opts.listingId}` : sql``}
      ${opts.q ? sql`and (ld.name ilike ${"%" + opts.q + "%"} or ld.phone ilike ${"%" + opts.q + "%"})` : sql``}
    order by ld.created_at desc limit 300`);
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    email: (r.email as string) ?? null,
    message: (r.message as string) ?? "",
    source: r.source as string,
    status: r.status as string,
    offerAmount: r.offer_amount != null ? Number(r.offer_amount) : null,
    aiScore: r.ai_score != null ? Number(r.ai_score) : null,
    aiSummary: (r.ai_summary as string) ?? null,
    notes: (r.notes as string) ?? "",
    isSaved: !!r.is_saved,
    createdAt: new Date(r.created_at as string).toISOString(),
    listingTitle: (r.listing_title as string) ?? null,
    listingSlug: (r.listing_slug as string) ?? null,
    listingPrice: r.listing_price != null ? Number(r.listing_price) : null,
    projectName: (r.project_name as string) ?? null,
    projectSlug: (r.project_slug as string) ?? null,
    recipientName: (r.recipient_name as string) ?? null,
    userId: (r.user_id as string) ?? null,
  }));
}

async function loadLeadForActor(db: Database, actor: Actor, leadId: string) {
  const [lead] = await db.select().from(s.leads).where(eq(s.leads.id, leadId));
  if (!lead) throw notFound("Lead");
  if (lead.recipientId === actor.id) return lead;
  if (lead.agencyId) {
    const [m] = await db.select().from(s.agencyMembers).where(and(eq(s.agencyMembers.userId, actor.id), eq(s.agencyMembers.agencyId, lead.agencyId), inArray(s.agencyMembers.role, ["admin", "manager"])));
    if (m) return lead;
  }
  if (actor.isStaff) return lead;
  throw forbidden();
}

export async function updateLead(db: Database, actor: Actor | null, leadId: string, raw: unknown & { isSaved?: boolean; assignToUserId?: string }) {
  requireActor(actor);
  const lead = await loadLeadForActor(db, actor, leadId);
  const parsed = leadUpdateSchema.extend({}).safeParse(raw);
  if (!parsed.success) throw badRequest("Invalid update");
  const patch: Partial<typeof s.leads.$inferInsert> = {};
  if (parsed.data.status) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "contacted") patch.lastContactedAt = new Date();
  }
  if (parsed.data.notes != null) patch.notes = parsed.data.notes;
  if (typeof raw.isSaved === "boolean") patch.isSaved = raw.isSaved;
  if (raw.assignToUserId && lead.agencyId) {
    const [m] = await db.select().from(s.agencyMembers).where(and(eq(s.agencyMembers.userId, raw.assignToUserId), eq(s.agencyMembers.agencyId, lead.agencyId)));
    if (!m) throw badRequest("That person is not in your agency");
    patch.recipientId = raw.assignToUserId;
    await notify(db, { userId: raw.assignToUserId, type: "new_lead", title: "Lead assigned to you", body: `${lead.name} was assigned to you.`, link: "/dashboard/leads" });
  }
  const [u] = await db.update(s.leads).set(patch).where(eq(s.leads.id, leadId)).returning();
  return u;
}

export function leadPipeline(leads: { status: string }[]) {
  return LEAD_STATUSES.map((st) => ({ status: st, count: leads.filter((l) => l.status === st).length }));
}

/* ------------------------------------------------------------------ */
/* Messaging                                                            */
/* ------------------------------------------------------------------ */

function kindFor(listing: { agentId: string | null; purpose: string } | null, project: boolean) {
  if (project) return "developer_buyer";
  if (!listing) return "direct";
  if (listing.agentId) return "buyer_agent";
  return listing.purpose === "rent" ? "tenant_landlord" : "buyer_seller";
}

export async function startConversation(db: Database, actor: Actor | null, opts: { listingId?: string; projectId?: string; userId?: string; message?: string }) {
  requireActor(actor);
  let otherId: string | null = opts.userId ?? null;
  let listing: typeof s.propertyListings.$inferSelect | null = null;
  if (opts.listingId) {
    [listing] = await db.select().from(s.propertyListings).where(eq(s.propertyListings.id, opts.listingId));
    if (!listing) throw notFound("Listing");
    otherId = listing.postedById;
  } else if (opts.projectId) {
    const [p] = await db.select({ ownerId: s.developers.ownerId }).from(s.projects).innerJoin(s.developers, eq(s.developers.id, s.projects.developerId)).where(eq(s.projects.id, opts.projectId));
    if (!p) throw notFound("Project");
    otherId = p.ownerId;
  }
  if (!otherId) throw badRequest("No one to message");
  if (otherId === actor.id) throw badRequest("You can't message yourself");
  const key = [actor.id, otherId].sort().join(":") + ":" + (opts.listingId ?? opts.projectId ?? "direct");
  let [conv] = await db.select().from(s.conversations).where(eq(s.conversations.participantKey, key));
  if (!conv) {
    [conv] = await db
      .insert(s.conversations)
      .values({ kind: kindFor(listing, !!opts.projectId), listingId: opts.listingId ?? null, projectId: opts.projectId ?? null, participantKey: key })
      .onConflictDoNothing()
      .returning();
    if (!conv) [conv] = await db.select().from(s.conversations).where(eq(s.conversations.participantKey, key));
    await db.insert(s.conversationParticipants).values([{ conversationId: conv.id, userId: actor.id }, { conversationId: conv.id, userId: otherId }]).onConflictDoNothing();
    if (opts.listingId) await db.insert(s.messages).values({ conversationId: conv.id, senderId: actor.id, kind: "property", listingId: opts.listingId, body: "" });
  }
  if (opts.message?.trim()) await sendMessage(db, actor, conv.id, { body: opts.message });
  return conv;
}

async function assertParticipant(db: Database, actor: Actor, conversationId: string) {
  const [p] = await db.select().from(s.conversationParticipants).where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.userId, actor.id)));
  if (!p) throw forbidden();
  return p;
}

export async function sendMessage(db: Database, actor: Actor | null, conversationId: string, raw: unknown, attachment?: { url: string; name: string; mime: string; size: number }) {
  requireActor(actor);
  await assertParticipant(db, actor, conversationId);
  const parsed = messageInputSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Invalid message");
  const input = parsed.data;
  if (!input.body && !attachment && !input.listingId) throw badRequest("Message is empty");
  const others = await db.select().from(s.conversationParticipants).where(and(eq(s.conversationParticipants.conversationId, conversationId), sql`${s.conversationParticipants.userId} <> ${actor.id}`));
  if (others.some((o) => o.isBlocked)) throw forbidden("This conversation has been blocked");
  const rl = await rateLimit(db, `msg:${actor.id}`, 60, 3600);
  if (!rl.ok) throw tooMany("You're sending messages too quickly.");
  const [{ recent }] = await db.select({ recent: sql<number>`count(*)::int` }).from(s.messages).where(and(eq(s.messages.senderId, actor.id), gt(s.messages.createdAt, new Date(Date.now() - 600_000))));
  const spam = messageSpamScore(input.body, recent);
  const block = (await getSetting<{ spamScoreBlock?: number }>(db, "fraud_thresholds"))?.spamScoreBlock ?? 50;
  const kind = attachment ? (attachment.mime.startsWith("image/") ? "image" : attachment.mime.startsWith("audio/") ? "voice" : "document") : input.listingId ? "property" : "text";
  const [msg] = await db
    .insert(s.messages)
    .values({
      conversationId,
      senderId: actor.id,
      kind,
      body: input.body,
      attachmentUrl: attachment?.url ?? null,
      attachmentName: attachment?.name ?? null,
      attachmentMime: attachment?.mime ?? null,
      attachmentSize: attachment?.size ?? null,
      listingId: input.listingId ?? null,
      spamScore: spam,
      isHidden: spam >= block,
    })
    .returning();
  const preview = kind === "text" ? input.body.slice(0, 140) : kind === "image" ? "📷 Photo" : kind === "voice" ? "🎤 Voice message" : kind === "property" ? "🏠 Shared a property" : `📎 ${attachment?.name}`;
  await db.update(s.conversations).set({ lastMessageAt: new Date(), lastMessagePreview: preview }).where(eq(s.conversations.id, conversationId));
  await db.update(s.conversationParticipants).set({ lastReadAt: new Date(), isArchived: false }).where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.userId, actor.id)));
  if (spam >= block) {
    await db.insert(s.fraudFlags).values({ targetType: "message", targetId: msg.id, rule: "spam_message", severity: "medium", score: spam, summary: "Message hidden by spam filter", details: { senderId: actor.id } });
  } else {
    for (const o of others) {
      // avoid notification storms: one notification per conversation per 10 min
      const [recentNotif] = await db.select({ id: s.notifications.id }).from(s.notifications).where(and(eq(s.notifications.userId, o.userId), eq(s.notifications.type, "new_message"), gt(s.notifications.createdAt, new Date(Date.now() - 600_000)), sql`${s.notifications.data}->>'conversationId' = ${conversationId}`));
      if (!recentNotif) await notify(db, { userId: o.userId, type: "new_message", title: `New message from ${actor.name}`, body: preview, link: `/messages/${conversationId}`, data: { conversationId } });
    }
  }
  return msg;
}

export async function listConversations(db: Database, actor: Actor) {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select c.id, c.kind, c.last_message_at, c.last_message_preview, c.listing_id, c.project_id,
      me.last_read_at, me.is_archived,
      ou.id as other_id, ou.name as other_name, ou.avatar_url as other_avatar, op.is_blocked as other_blocked,
      l.title as listing_title, l.slug as listing_slug, pr.name as project_name,
      (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id <> ${actor.id} and not m.is_hidden and (me.last_read_at is null or m.created_at > me.last_read_at)) as unread
    from conversation_participants me
    join conversations c on c.id = me.conversation_id
    join conversation_participants op on op.conversation_id = c.id and op.user_id <> ${actor.id}
    join users ou on ou.id = op.user_id
    left join property_listings l on l.id = c.listing_id
    left join projects pr on pr.id = c.project_id
    where me.user_id = ${actor.id}
    order by c.last_message_at desc limit 200`);
  return rows.map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    lastMessageAt: new Date(r.last_message_at as string).toISOString(),
    preview: (r.last_message_preview as string) ?? "",
    otherId: r.other_id as string,
    otherName: r.other_name as string,
    otherAvatar: (r.other_avatar as string) ?? null,
    listingTitle: (r.listing_title as string) ?? null,
    listingSlug: (r.listing_slug as string) ?? null,
    projectName: (r.project_name as string) ?? null,
    unread: Number(r.unread),
    archived: !!r.is_archived,
  }));
}

export async function getConversation(db: Database, actor: Actor, conversationId: string, opts: { after?: string } = {}) {
  const me = await assertParticipant(db, actor, conversationId);
  const [conv] = await db.select().from(s.conversations).where(eq(s.conversations.id, conversationId));
  const msgs = await db.execute<Record<string, unknown>>(sql`
    select m.*, l.title as l_title, l.slug as l_slug, l.price as l_price, l.purpose as l_purpose,
      (select url from property_media pm where pm.property_id = l.property_id and pm.kind = 'image' order by sort_order limit 1) as l_cover
    from messages m left join property_listings l on l.id = m.listing_id
    where m.conversation_id = ${conversationId} and (not m.is_hidden or m.sender_id = ${actor.id})
      ${opts.after ? sql`and m.created_at > ${new Date(opts.after).toISOString()}::timestamptz` : sql``}
    order by m.created_at asc limit 500`);
  await db.update(s.conversationParticipants).set({ lastReadAt: new Date() }).where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.userId, actor.id)));
  const [other] = await db
    .select({ id: s.users.id, name: s.users.name, avatarUrl: s.users.avatarUrl, verificationLevel: s.users.verificationLevel, lastReadAt: s.conversationParticipants.lastReadAt, isBlocked: s.conversationParticipants.isBlocked })
    .from(s.conversationParticipants)
    .innerJoin(s.users, eq(s.users.id, s.conversationParticipants.userId))
    .where(and(eq(s.conversationParticipants.conversationId, conversationId), sql`${s.conversationParticipants.userId} <> ${actor.id}`));
  return {
    conversation: conv,
    other,
    blockedByMe: me.isBlocked,
    messages: msgs.map((m) => ({
      id: m.id as string,
      senderId: m.sender_id as string,
      mine: m.sender_id === actor.id,
      kind: m.kind as string,
      body: m.body as string,
      attachmentUrl: (m.attachment_url as string) ?? null,
      attachmentName: (m.attachment_name as string) ?? null,
      attachmentMime: (m.attachment_mime as string) ?? null,
      hidden: !!m.is_hidden,
      createdAt: new Date(m.created_at as string).toISOString(),
      listing: m.l_slug ? { title: m.l_title as string, slug: m.l_slug as string, price: Number(m.l_price), purpose: m.l_purpose as string, cover: (m.l_cover as string) ?? null } : null,
    })),
  };
}

export async function setConversationBlocked(db: Database, actor: Actor | null, conversationId: string, blocked: boolean) {
  requireActor(actor);
  await assertParticipant(db, actor, conversationId);
  await db.update(s.conversationParticipants).set({ isBlocked: blocked }).where(and(eq(s.conversationParticipants.conversationId, conversationId), eq(s.conversationParticipants.userId, actor.id)));
}

export async function canAccessAttachment(db: Database, actor: Actor, url: string) {
  const rows = await db.execute(sql`
    select 1 from messages m join conversation_participants cp on cp.conversation_id = m.conversation_id and cp.user_id = ${actor.id}
    where m.attachment_url = ${url} limit 1`);
  return rows.length > 0 || actor.isStaff;
}

export async function unreadMessages(db: Database, userId: string) {
  const [r] = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from conversation_participants me join messages m on m.conversation_id = me.conversation_id
    where me.user_id = ${userId} and m.sender_id <> ${userId} and not m.is_hidden and (me.last_read_at is null or m.created_at > me.last_read_at)`);
  return Number(r?.n ?? 0);
}

/* ------------------------------------------------------------------ */
/* Appointments / visits                                                */
/* ------------------------------------------------------------------ */

export async function requestVisit(db: Database, actor: Actor | null, raw: unknown) {
  requireActor(actor);
  const parsed = appointmentInputSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Please choose a valid date and time", parsed.error.flatten());
  const input = parsed.data;
  const when = new Date(`${input.date}T${input.time}:00+05:00`); // Pakistan Standard Time
  if (when.getTime() < Date.now() + 30 * 60_000) throw badRequest("Choose a time at least 30 minutes from now");
  if (when.getTime() > Date.now() + 60 * 86400_000) throw badRequest("Visits can be booked up to 60 days ahead");
  const hour = Number(input.time.slice(0, 2));
  if (hour < 8 || hour > 20) throw badRequest("Visits can be scheduled between 8:00 and 20:00");
  let hostId: string | null = null;
  let title = "";
  if (input.listingId) {
    const l = await listingRecipient(db, input.listingId);
    hostId = l.postedById;
    title = l.title;
  } else if (input.projectId) {
    const [p] = await db.select({ name: s.projects.name, ownerId: s.developers.ownerId }).from(s.projects).innerJoin(s.developers, eq(s.developers.id, s.projects.developerId)).where(eq(s.projects.id, input.projectId));
    if (!p) throw notFound("Project");
    hostId = p.ownerId;
    title = p.name;
  }
  if (!hostId) throw badRequest("This property doesn't accept visit requests");
  if (hostId === actor.id) throw badRequest("You can't book a visit to your own listing");
  const clash = input.listingId ? await db.select({ id: s.appointments.id }).from(s.appointments).where(and(eq(s.appointments.requesterId, actor.id), eq(s.appointments.listingId, input.listingId), inArray(s.appointments.status, ["requested", "confirmed"]), gt(s.appointments.scheduledAt, new Date()))) : [];
  if (clash.length) throw badRequest("You already have an upcoming visit for this property");
  const [appt] = await db
    .insert(s.appointments)
    .values({ listingId: input.listingId ?? null, projectId: input.projectId ?? null, requesterId: actor.id, hostId, scheduledAt: when, visitors: input.visitors, phone: input.phone, message: input.message })
    .returning();
  if (input.listingId) await db.insert(s.listingEvents).values({ listingId: input.listingId, type: "visit_request", userId: actor.id });
  await notify(db, { userId: hostId, type: "visit_update", title: "New visit request", body: `${actor.name} wants to visit “${title}” on ${when.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}.`, link: "/dashboard/appointments" });
  return appt;
}

const HOST_TRANSITIONS: Record<string, string[]> = { requested: ["confirmed", "rejected", "cancelled"], confirmed: ["completed", "no_show", "cancelled"] };
const GUEST_TRANSITIONS: Record<string, string[]> = { requested: ["cancelled"], confirmed: ["cancelled"] };

export async function updateVisit(db: Database, actor: Actor | null, id: string, raw: unknown) {
  requireActor(actor);
  const parsed = appointmentUpdateSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Invalid status");
  const [a] = await db.select().from(s.appointments).where(eq(s.appointments.id, id));
  if (!a) throw notFound("Appointment");
  const isHost = a.hostId === actor.id;
  const isGuest = a.requesterId === actor.id;
  if (!isHost && !isGuest) throw forbidden();
  const allowed = (isHost ? HOST_TRANSITIONS : GUEST_TRANSITIONS)[a.status] ?? [];
  if (!allowed.includes(parsed.data.status)) throw badRequest(`Can't change a ${a.status} visit to ${parsed.data.status}`);
  if (["completed", "no_show"].includes(parsed.data.status) && a.scheduledAt > new Date()) throw badRequest("You can mark the outcome after the scheduled time");
  const [u] = await db.update(s.appointments).set({ status: parsed.data.status, responseNote: parsed.data.note ?? a.responseNote, respondedAt: new Date() }).where(eq(s.appointments.id, id)).returning();
  const notifyId = isHost ? a.requesterId : a.hostId;
  const label = { confirmed: "confirmed", rejected: "declined", cancelled: "cancelled", completed: "marked completed", no_show: "marked as no-show" }[parsed.data.status as string] ?? parsed.data.status;
  await notify(db, { userId: notifyId, type: "visit_update", title: `Visit ${label}`, body: `${actor.name} ${label} the visit on ${a.scheduledAt.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })}.${parsed.data.note ? ` Note: ${parsed.data.note}` : ""}`, link: "/dashboard/appointments" });
  return u;
}

export async function listVisits(db: Database, actor: Actor, role: "host" | "guest" | "all" = "all") {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select a.*, l.title as listing_title, l.slug as listing_slug, p.address, pr.name as project_name, pr.slug as project_slug,
      ru.name as requester_name, hu.name as host_name
    from appointments a
    left join property_listings l on l.id = a.listing_id
    left join properties p on p.id = l.property_id
    left join projects pr on pr.id = a.project_id
    join users ru on ru.id = a.requester_id
    join users hu on hu.id = a.host_id
    where ${role === "host" ? sql`a.host_id = ${actor.id}` : role === "guest" ? sql`a.requester_id = ${actor.id}` : sql`(a.host_id = ${actor.id} or a.requester_id = ${actor.id})`}
    order by a.scheduled_at desc limit 300`);
  return rows.map((r) => ({
    id: r.id as string,
    status: r.status as string,
    scheduledAt: new Date(r.scheduled_at as string).toISOString(),
    durationMins: Number(r.duration_mins),
    visitors: Number(r.visitors),
    phone: (r.phone as string) ?? null,
    message: (r.message as string) ?? "",
    responseNote: (r.response_note as string) ?? null,
    isHost: r.host_id === actor.id,
    title: ((r.listing_title ?? r.project_name) as string) ?? "Property visit",
    link: r.listing_slug ? `/property/${r.listing_slug}` : r.project_slug ? `/project/${r.project_slug}` : null,
    address: (r.address as string) ?? null,
    requesterName: r.requester_name as string,
    hostName: r.host_name as string,
  }));
}

/** iCalendar export for calendar integration (Google / Outlook / Apple). */
export async function visitsIcs(db: Database, actor: Actor) {
  const visits = (await listVisits(db, actor)).filter((v) => ["requested", "confirmed"].includes(v.status));
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (t: string) => t.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bismillah Pakistan//Visits//EN", "CALSCALE:GREGORIAN"];
  for (const v of visits) {
    const start = new Date(v.scheduledAt);
    const end = new Date(start.getTime() + v.durationMins * 60_000);
    lines.push("BEGIN:VEVENT", `UID:${v.id}@propertyx`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, `SUMMARY:${esc(`${v.status === "requested" ? "[Requested] " : ""}Visit: ${v.title}`)}`, `DESCRIPTION:${esc(`${v.isHost ? `Visitor: ${v.requesterName}` : `Host: ${v.hostName}`}\n${v.message}`)}`, v.address ? `LOCATION:${esc(v.address)}` : "", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export async function markPastVisits(db: Database) {
  // requested visits whose time passed without a response are auto-cancelled
  await db.update(s.appointments).set({ status: "cancelled", responseNote: "Expired without confirmation" }).where(and(eq(s.appointments.status, "requested"), lt(s.appointments.scheduledAt, new Date())));
}

