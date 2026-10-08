import { pgTable, text, uuid, integer, timestamp, index, uniqueIndex, jsonb, boolean } from "drizzle-orm/pg-core";
import { id, createdAt, updatedAt, isSeed } from "./_helpers";
import { users } from "./identity";
import { locations } from "./locations";
import { contentStatusEnum } from "./enums";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: id(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    /** Markdown body (rendered with a safe subset; raw HTML is escaped) */
    body: text("body").notNull(),
    category: text("category").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]),
    coverImage: text("cover_image"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    readingMinutes: integer("reading_minutes").notNull().default(3),
    viewsCount: integer("views_count").notNull().default(0),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("blog_slug_uq").on(t.slug), index("blog_status_idx").on(t.status, t.category, t.publishedAt)],
);

export const areaGuides = pgTable(
  "area_guides",
  {
    id: id(),
    locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    body: text("body").notNull(),
    pros: jsonb("pros").$type<string[]>().default([]),
    cons: jsonb("cons").$type<string[]>().default([]),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    status: contentStatusEnum("status").notNull().default("published"),
    isSeed: isSeed(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("area_guides_location_uq").on(t.locationId)],
);

export const forumThreads = pgTable(
  "forum_threads",
  {
    id: id(),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    body: text("body").notNull(),
    category: text("category").notNull().default("general"),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(false),
    viewsCount: integer("views_count").notNull().default(0),
    repliesCount: integer("replies_count").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("forum_slug_uq").on(t.slug), index("forum_category_idx").on(t.category, t.lastActivityAt), index("forum_location_idx").on(t.locationId)],
);

export const forumPosts = pgTable(
  "forum_posts",
  {
    id: id(),
    threadId: uuid("thread_id").notNull().references(() => forumThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isAccepted: boolean("is_accepted").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(false),
    upvotes: integer("upvotes").notNull().default(0),
    isSeed: isSeed(),
    createdAt: createdAt(),
  },
  (t) => [index("forum_posts_thread_idx").on(t.threadId, t.createdAt)],
);

export const forumVotes = pgTable(
  "forum_votes",
  {
    postId: uuid("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("forum_votes_uq").on(t.postId, t.userId)],
);

/** AI assistant conversations (stored so users can continue them). */
export const aiSessions = pgTable(
  "ai_sessions",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    anonId: text("anon_id"),
    kind: text("kind").notNull().default("search"),
    /** accumulated structured search criteria */
    criteria: jsonb("criteria").$type<Record<string, unknown>>().notNull().default({}),
    messages: jsonb("messages").$type<{ role: "user" | "assistant"; content: string; listingIds?: string[]; at: string }[]>().notNull().default([]),
    provider: text("provider"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ai_sessions_user_idx").on(t.userId)],
);
