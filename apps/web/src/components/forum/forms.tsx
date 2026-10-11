"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { FORUM_CATEGORIES } from "@propertyx/shared";
import { askQuestion, postReply, type FormState } from "@/app/(site)/forum/actions";

export function AskForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(askQuestion, null);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="f-title">Your question</label>
        <input id="f-title" name="title" className="input" required minLength={10} maxLength={160} placeholder="e.g. Is Fine City Burewala a good investment?" />
      </div>
      <div>
        <label className="label" htmlFor="f-body">Details</label>
        <textarea id="f-body" name="body" className="input min-h-28" required minLength={20} maxLength={8000} placeholder="Budget, area, what you've already checked…" />
      </div>
      <div>
        <label className="label" htmlFor="f-cat">Topic</label>
        <select id="f-cat" name="category" className="input" defaultValue="general">
          {FORUM_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Post question
      </button>
    </form>
  );
}

export function ReplyForm({ threadId, slug }: { threadId: string; slug: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(postReply, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="label" htmlFor="f-reply">Your answer</label>
      <textarea id="f-reply" name="body" className="input min-h-28" required minLength={5} maxLength={5000} placeholder="Share what you know. Please don't post phone numbers or ask for advance payments." />
      {state?.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Thanks — your answer was posted.</p>}
      <button className="btn-primary" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Post answer
      </button>
    </form>
  );
}
