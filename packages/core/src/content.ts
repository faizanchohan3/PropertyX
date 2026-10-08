import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import * as s from "@propertyx/database";
import { audit, rateLimit } from "@propertyx/auth";
import { notify } from "@propertyx/notifications";
import { z } from "zod";
import { slugify, shortId, BLOG_CATEGORIES, FORUM_CATEGORIES } from "@propertyx/shared";
import { badRequest, conflict, forbidden, notFound, requireActor, requirePerm, tooMany, type Actor } from "./errors";
import { scamTextScore } from "./fraud";

/* ---------------- Blog / CMS ---------------- */

export async function listPosts(db: Database, opts: { category?: string; q?: string; page?: number; includeDrafts?: boolean } = {}) {
  const page = opts.page ?? 1;
  const where = and(
    opts.includeDrafts ? sql`true` : eq(s.blogPosts.status, "published"),
    opts.category ? eq(s.blogPosts.category, opts.category) : sql`true`,
    opts.q ? sql`(${s.blogPosts.title} ilike ${"%" + opts.q + "%"} or ${s.blogPosts.excerpt} ilike ${"%" + opts.q + "%"})` : sql`true`,
  );
  const items = await db.select().from(s.blogPosts).where(where).orderBy(desc(sql`coalesce(${s.blogPosts.publishedAt}, ${s.blogPosts.createdAt})`)).limit(12).offset((page - 1) * 12);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(s.blogPosts).where(where);
  return { items, total, page };
}

export async function getPost(db: Database, slug: string, viewer?: Actor | null) {
  const [p] = await db.select({ p: s.blogPosts, authorName: s.users.name }).from(s.blogPosts).leftJoin(s.users, eq(s.users.id, s.blogPosts.authorId)).where(eq(s.blogPosts.slug, slug));
  if (!p) return null;
  if (p.p.status !== "published" && !viewer?.permissions.includes("content.manage")) return null;
  if (p.p.status === "published") await db.update(s.blogPosts).set({ viewsCount: sql`${s.blogPosts.viewsCount} + 1` }).where(eq(s.blogPosts.id, p.p.id));
  const related = await db.select().from(s.blogPosts).where(and(eq(s.blogPosts.status, "published"), eq(s.blogPosts.category, p.p.category), sql`${s.blogPosts.id} <> ${p.p.id}`)).limit(3);
  return { post: p.p, authorName: p.authorName, related };
}

const postSchema = z.object({
  title: z.string().trim().min(5).max(160),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().min(10).max(400),
  body: z.string().trim().min(50).max(60_000),
  category: z.enum(BLOG_CATEGORIES.map((c) => c.key) as [string, ...string[]]),
  tags: z.array(z.string().max(40)).max(10).default([]),
  coverImage: z.string().max(500).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(170).optional().nullable(),
});

export async function savePost(db: Database, actor: Actor | null, raw: unknown, id?: string) {
  requirePerm(actor, "content.manage");
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Please complete the post", parsed.error.flatten());
  const d = parsed.data;
  const slug = slugify(d.slug || d.title);
  const [clash] = await db.select({ id: s.blogPosts.id }).from(s.blogPosts).where(eq(s.blogPosts.slug, slug));
  if (clash && clash.id !== id) throw conflict("Another post already uses this URL slug");
  const values = { ...d, slug, coverImage: d.coverImage ?? null, seoTitle: d.seoTitle || d.title.slice(0, 70), seoDescription: d.seoDescription || d.excerpt.slice(0, 160), readingMinutes: Math.max(1, Math.round(d.body.split(/\s+/).length / 200)) };
  let postId = id;
  if (id) {
    const [existing] = await db.select().from(s.blogPosts).where(eq(s.blogPosts.id, id));
    if (!existing) throw notFound("Post");
    await db.update(s.blogPosts).set({ ...values, publishedAt: d.status === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt }).where(eq(s.blogPosts.id, id));
  } else {
    const [p] = await db.insert(s.blogPosts).values({ ...values, authorId: actor.id, publishedAt: d.status === "published" ? new Date() : null }).returning();
    postId = p.id;
  }
  await audit(db, { actorId: actor.id, action: id ? "post.update" : "post.create", entityType: "blog_post", entityId: postId });
  return postId!;
}

export async function deletePost(db: Database, actor: Actor | null, id: string) {
  requirePerm(actor, "content.manage");
  await db.delete(s.blogPosts).where(eq(s.blogPosts.id, id));
  await audit(db, { actorId: actor.id, action: "post.delete", entityType: "blog_post", entityId: id });
}

const locationContentSchema = z.object({
  overview: z.string().max(4000).optional().nullable(),
  investmentOutlook: z.string().max(4000).optional().nullable(),
  highlights: z.array(z.string().max(120)).max(10).default([]),
  seoTitle: z.string().max(70).optional().nullable(),
  seoDescription: z.string().max(170).optional().nullable(),
  guide: z.object({ title: z.string().max(120), summary: z.string().max(400), body: z.string().max(20000), pros: z.array(z.string().max(120)).max(8), cons: z.array(z.string().max(120)).max(8) }).optional().nullable(),
});

/** Admin "Manage areas": edit SEO/overview content and the area guide. */
export async function saveLocationContent(db: Database, actor: Actor | null, locationId: string, raw: unknown) {
  requirePerm(actor, "content.manage");
  const d = locationContentSchema.parse(raw);
  await db.update(s.locations).set({ overview: d.overview ?? null, investmentOutlook: d.investmentOutlook ?? null, highlights: d.highlights, seoTitle: d.seoTitle ?? null, seoDescription: d.seoDescription ?? null }).where(eq(s.locations.id, locationId));
  if (d.guide) {
    await db
      .insert(s.areaGuides)
      .values({ locationId, ...d.guide, authorId: actor.id })
      .onConflictDoUpdate({ target: s.areaGuides.locationId, set: { ...d.guide, authorId: actor.id, updatedAt: new Date() } });
  }
  await audit(db, { actorId: actor.id, action: "location.content", entityType: "location", entityId: locationId });
}

/* ---------------- Forum ---------------- */

export async function listThreads(db: Database, opts: { category?: string; location?: string; q?: string; page?: number } = {}) {
  const page = opts.page ?? 1;
  const rows = await db.execute<Record<string, unknown>>(sql`
    select t.*, u.name as author_name, l.name as location_name, l.slug as location_slug, count(*) over() as total
    from forum_threads t join users u on u.id = t.author_id left join locations l on l.id = t.location_id
    where not t.is_hidden
      ${opts.category ? sql`and t.category = ${opts.category}` : sql``}
      ${opts.location ? sql`and (l.slug = ${opts.location} or l.parent_id = (select id from locations where slug = ${opts.location}))` : sql``}
      ${opts.q ? sql`and (t.title ilike ${"%" + opts.q + "%"} or t.body ilike ${"%" + opts.q + "%"})` : sql``}
    order by t.is_pinned desc, t.last_activity_at desc limit 20 offset ${(page - 1) * 20}`);
  return { items: rows, total: Number(rows[0]?.total ?? 0) };
}

export async function getThread(db: Database, slug: string, viewer?: Actor | null) {
  const [t] = await db.select({ t: s.forumThreads, authorName: s.users.name }).from(s.forumThreads).innerJoin(s.users, eq(s.users.id, s.forumThreads.authorId)).where(eq(s.forumThreads.slug, slug));
  if (!t || (t.t.isHidden && !viewer?.permissions.includes("forum.moderate"))) return null;
  await db.update(s.forumThreads).set({ viewsCount: sql`${s.forumThreads.viewsCount} + 1` }).where(eq(s.forumThreads.id, t.t.id));
  const posts = await db.execute<Record<string, unknown>>(sql`
    select p.*, u.name as author_name, exists(select 1 from agents a where a.user_id = u.id) as is_agent,
      ${viewer ? sql`exists(select 1 from forum_votes v where v.post_id = p.id and v.user_id = ${viewer.id})` : sql`false`} as voted
    from forum_posts p join users u on u.id = p.author_id
    where p.thread_id = ${t.t.id} and (not p.is_hidden ${viewer?.permissions.includes("forum.moderate") ? sql`or true` : sql``})
    order by p.is_accepted desc, p.upvotes desc, p.created_at asc`);
  const [loc] = t.t.locationId ? await db.select().from(s.locations).where(eq(s.locations.id, t.t.locationId)) : [];
  return { thread: t.t, authorName: t.authorName, posts, location: loc ?? null };
}

const threadSchema = z.object({ title: z.string().trim().min(10).max(160), body: z.string().trim().min(20).max(8000), category: z.enum(FORUM_CATEGORIES.map((c) => c.key) as [string, ...string[]]), locationSlug: z.string().optional().nullable() });

export async function createThread(db: Database, actor: Actor | null, raw: unknown) {
  requirePerm(actor, "forum.post");
  const rl = await rateLimit(db, `thread:${actor.id}`, 5, 3600);
  if (!rl.ok) throw tooMany();
  const parsed = threadSchema.safeParse(raw);
  if (!parsed.success) throw badRequest("Please complete your question", parsed.error.flatten());
  const d = parsed.data;
  if (scamTextScore(d.body).score >= 30) throw badRequest("Your post was blocked by our spam filter");
  const [loc] = d.locationSlug ? await db.select({ id: s.locations.id }).from(s.locations).where(eq(s.locations.slug, d.locationSlug)) : [];
  const [t] = await db.insert(s.forumThreads).values({ authorId: actor.id, title: d.title, body: d.body, category: d.category, locationId: loc?.id ?? null, slug: `${slugify(d.title).slice(0, 80)}-${shortId(4)}` }).returning();
  return t;
}

export async function replyToThread(db: Database, actor: Actor | null, threadId: string, body: string) {
  requirePerm(actor, "forum.post");
  const rl = await rateLimit(db, `reply:${actor.id}`, 30, 3600);
  if (!rl.ok) throw tooMany();
  const text = body?.trim() ?? "";
  if (text.length < 5 || text.length > 5000) throw badRequest("Reply must be 5–5000 characters");
  const [t] = await db.select().from(s.forumThreads).where(eq(s.forumThreads.id, threadId));
  if (!t || t.isHidden) throw notFound("Thread");
  if (t.isLocked) throw forbidden("This thread is locked");
  const spam = scamTextScore(text).score >= 30;
  const [p] = await db.insert(s.forumPosts).values({ threadId, authorId: actor.id, body: text, isHidden: spam }).returning();
  if (!spam) {
    await db.update(s.forumThreads).set({ repliesCount: sql`${s.forumThreads.repliesCount} + 1`, lastActivityAt: new Date() }).where(eq(s.forumThreads.id, threadId));
    if (t.authorId !== actor.id) await notify(db, { userId: t.authorId, type: "system", title: "New answer to your question", body: `${actor.name} replied to “${t.title}”`, link: `/forum/${t.slug}` });
  }
  return p;
}

export async function votePost(db: Database, actor: Actor | null, postId: string) {
  requireActor(actor);
  const r = await db.insert(s.forumVotes).values({ postId, userId: actor.id }).onConflictDoNothing().returning();
  if (r.length) await db.update(s.forumPosts).set({ upvotes: sql`${s.forumPosts.upvotes} + 1` }).where(eq(s.forumPosts.id, postId));
  return { voted: true };
}

export async function acceptAnswer(db: Database, actor: Actor | null, postId: string) {
  requireActor(actor);
  const [p] = await db.select({ p: s.forumPosts, authorId: s.forumThreads.authorId }).from(s.forumPosts).innerJoin(s.forumThreads, eq(s.forumThreads.id, s.forumPosts.threadId)).where(eq(s.forumPosts.id, postId));
  if (!p) throw notFound();
  if (p.authorId !== actor.id) throw forbidden("Only the person who asked can accept an answer");
  await db.update(s.forumPosts).set({ isAccepted: false }).where(eq(s.forumPosts.threadId, p.p.threadId));
  await db.update(s.forumPosts).set({ isAccepted: true }).where(eq(s.forumPosts.id, postId));
}

export async function moderateForum(db: Database, actor: Actor | null, target: { threadId?: string; postId?: string }, patch: { hidden?: boolean; locked?: boolean; pinned?: boolean }) {
  requirePerm(actor, "forum.moderate");
  if (target.threadId) await db.update(s.forumThreads).set({ ...(patch.hidden != null ? { isHidden: patch.hidden } : {}), ...(patch.locked != null ? { isLocked: patch.locked } : {}), ...(patch.pinned != null ? { isPinned: patch.pinned } : {}) }).where(eq(s.forumThreads.id, target.threadId));
  if (target.postId && patch.hidden != null) await db.update(s.forumPosts).set({ isHidden: patch.hidden }).where(eq(s.forumPosts.id, target.postId));
  await audit(db, { actorId: actor.id, action: "forum.moderate", entityType: target.threadId ? "forum_thread" : "forum_post", entityId: target.threadId ?? target.postId, metadata: patch });
}

/* ---------------- Follows ---------------- */

const FOLLOW_TYPES = ["location", "agent", "agency", "developer", "project"] as const;
export async function toggleFollow(db: Database, actor: Actor | null, targetType: string, targetId: string) {
  requireActor(actor);
  if (!FOLLOW_TYPES.includes(targetType as never)) throw badRequest("Can't follow that");
  const where = and(eq(s.follows.userId, actor.id), eq(s.follows.targetType, targetType), eq(s.follows.targetId, targetId));
  const [existing] = await db.select().from(s.follows).where(where);
  if (existing) {
    await db.delete(s.follows).where(where);
    return { following: false };
  }
  await db.insert(s.follows).values({ userId: actor.id, targetType, targetId });
  return { following: true };
}

export async function isFollowing(db: Database, actor: Actor | null | undefined, targetType: string, targetId: string) {
  if (!actor) return false;
  const [f] = await db.select().from(s.follows).where(and(eq(s.follows.userId, actor.id), eq(s.follows.targetType, targetType), eq(s.follows.targetId, targetId)));
  return !!f;
}

export async function myFollows(db: Database, actor: Actor) {
  return db.execute<Record<string, unknown>>(sql`
    select f.target_type, f.target_id, f.created_at,
      case f.target_type
        when 'location' then (select json_build_object('name', full_name, 'href', '/area/' || slug) from locations where id = f.target_id)
        when 'agent' then (select json_build_object('name', display_name, 'href', '/agents/' || slug) from agents where id = f.target_id)
        when 'agency' then (select json_build_object('name', name, 'href', '/agencies/' || slug) from agencies where id = f.target_id)
        when 'developer' then (select json_build_object('name', name, 'href', '/developers/' || slug) from developers where id = f.target_id)
        when 'project' then (select json_build_object('name', name, 'href', '/project/' || slug) from projects where id = f.target_id)
      end as target
    from follows f where f.user_id = ${actor.id} order by f.created_at desc`);
}
