"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createThread, replyToThread } from "@propertyx/core";
import { db, getUser } from "@/lib/server";

export type FormState = { error?: string; ok?: boolean } | null;

export async function askQuestion(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect("/login?next=/forum");
  let slug: string;
  try {
    const t = await createThread(db, user, { title: form.get("title"), body: form.get("body"), category: form.get("category"), locationSlug: form.get("location") || null });
    slug = t.slug;
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/forum");
  redirect(`/forum/${slug}`);
}

export async function postReply(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getUser();
  const slug = String(form.get("slug") ?? "");
  if (!user) redirect(`/login?next=/forum/${slug}`);
  try {
    await replyToThread(db, user, String(form.get("threadId") ?? ""), String(form.get("body") ?? ""));
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/forum/${slug}`);
  return { ok: true };
}
