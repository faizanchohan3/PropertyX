"use client";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] },
  ) {
    super(message);
  }
}

/** Browser fetch helper for our JSON API. Throws ApiError with the server's message. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    headers: opts.form ? undefined : { "content-type": "application/json" },
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    credentials: "same-origin",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? "error", err.message ?? `Request failed (${res.status})`, err.details);
  }
  return data as T;
}

export function fieldError(e: unknown, field: string): string | undefined {
  if (e instanceof ApiError) return e.details?.fieldErrors?.[field]?.[0];
  return undefined;
}

export function anonId() {
  try {
    let id = localStorage.getItem("px_anon");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("px_anon", id);
    }
    return id;
  } catch {
    return null;
  }
}
