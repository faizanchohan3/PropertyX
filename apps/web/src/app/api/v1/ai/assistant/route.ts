import { eq } from "drizzle-orm";
import { runAssistant, type AssistantCriteria } from "@propertyx/ai";
import { createSearchEngine } from "@propertyx/search";
import { aiSessions } from "@propertyx/database";
import { badRequest } from "@propertyx/core";
import { route, body } from "@/lib/api";
import { db } from "@/lib/server";

export const POST = route(async ({ req, user }) => {
  const b = await body<{ message?: string; criteria?: AssistantCriteria; lastResultPrices?: number[]; sessionId?: string }>(req);
  const message = (b.message ?? "").trim();
  if (!message || message.length > 500) throw badRequest("Ask in 1–500 characters");
  const res = await runAssistant(db, createSearchEngine(db), { message, criteria: b.criteria ?? {}, lastResultPrices: Array.isArray(b.lastResultPrices) ? b.lastResultPrices.slice(0, 30).map(Number) : [] });

  // keep a history for signed-in users (continue later, analytics)
  let sessionId = b.sessionId;
  if (user) {
    const entry = [
      { role: "user" as const, content: message, at: new Date().toISOString() },
      { role: "assistant" as const, content: res.reply, listingIds: res.results.map((r) => r.listing.id), at: new Date().toISOString() },
    ];
    const [existing] = sessionId ? await db.select().from(aiSessions).where(eq(aiSessions.id, sessionId)) : [];
    if (existing && existing.userId === user.id) {
      await db.update(aiSessions).set({ criteria: res.criteria as Record<string, unknown>, messages: [...existing.messages, ...entry].slice(-60), provider: res.provider }).where(eq(aiSessions.id, existing.id));
    } else {
      const [s] = await db.insert(aiSessions).values({ userId: user.id, criteria: res.criteria as Record<string, unknown>, messages: entry, provider: res.provider }).returning({ id: aiSessions.id });
      sessionId = s.id;
    }
  }
  return { ...res, sessionId };
}, { rate: 30 });
