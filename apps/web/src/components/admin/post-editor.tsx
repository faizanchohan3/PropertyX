"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Eye } from "lucide-react";
import { BLOG_CATEGORIES } from "@propertyx/shared";
import { api, ApiError } from "@/lib/client";
import { toast } from "../toast";
import { darkInput, okBtn, darkBtn } from "./ui";
import { renderMarkdown } from "@/lib/markdown";

export type PostForm = { id?: string; title: string; slug: string; excerpt: string; body: string; category: string; tags: string[]; coverImage: string; status: string; seoTitle: string; seoDescription: string };

export function PostEditor({ initial }: { initial: PostForm }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const save = async (status?: string) => {
    setBusy(true);
    try {
      const r = await api<string | { id: string }>("/api/v1/admin/post.save", { body: { ...p, status: status ?? p.status } });
      toast("Saved");
      const id = typeof r === "string" ? r : p.id;
      if (!p.id && id) router.push(`/admin/content/${id}`);
      else router.refresh();
    } catch (e) {
      const fe = e instanceof ApiError ? e.details?.fieldErrors : undefined;
      toast(fe ? Object.entries(fe).map(([k, v]) => `${k}: ${v[0]}`).join(" · ") : (e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const upload = async (f?: File) => {
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("folder", "cms");
    try {
      const r = await api<{ url: string }>("/api/v1/uploads/image", { form: fd });
      setP({ ...p, coverImage: r.url });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const label = (t: string, el: React.ReactNode) => (
    <label className="block space-y-1 text-xs text-slate-400">
      <span>{t}</span>
      {el}
    </label>
  );
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="dark-panel space-y-4 p-5">
        {label("Title", <input className={`${darkInput} text-lg font-bold`} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />)}
        {label("Excerpt", <textarea className={`${darkInput} min-h-16`} value={p.excerpt} onChange={(e) => setP({ ...p, excerpt: e.target.value })} />)}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Body (Markdown: ## headings, **bold**, lists, | tables |, &gt; quotes)</span>
          <button className={darkBtn} onClick={() => setPreview((x) => !x)}>
            <Eye className="h-3.5 w-3.5" /> {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div className="prose-px rounded-xl bg-white p-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
        ) : (
          <textarea className={`${darkInput} min-h-[420px] font-mono text-xs`} value={p.body} onChange={(e) => setP({ ...p, body: e.target.value })} />
        )}
      </div>
      <div className="space-y-4">
        <div className="dark-panel space-y-3 p-5">
          {label(
            "Status",
            <select className={darkInput} value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>,
          )}
          {label(
            "Category",
            <select className={darkInput} value={p.category} onChange={(e) => setP({ ...p, category: e.target.value })}>
              {BLOG_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>,
          )}
          {label("URL slug", <input className={darkInput} value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} placeholder="auto from title" />)}
          {label("Tags (comma separated)", <input className={darkInput} value={p.tags.join(", ")} onChange={(e) => setP({ ...p, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />)}
          <div className="space-y-1 text-xs text-slate-400">
            <span>Cover image</span>
            {p.coverImage && <img src={p.coverImage} alt="" className="aspect-video w-full rounded-lg object-cover" />}
            <div className="flex gap-2">
              <input className={darkInput} value={p.coverImage} onChange={(e) => setP({ ...p, coverImage: e.target.value })} placeholder="https://… or upload" />
              <button className={darkBtn} onClick={() => file.current?.click()} aria-label="Upload cover">
                <Upload className="h-3.5 w-3.5" />
              </button>
              <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} />
            </div>
          </div>
        </div>
        <div className="dark-panel space-y-3 p-5">
          <p className="text-sm font-semibold text-white">SEO</p>
          {label("SEO title", <input className={darkInput} maxLength={70} value={p.seoTitle} onChange={(e) => setP({ ...p, seoTitle: e.target.value })} />)}
          {label("Meta description", <textarea className={darkInput} maxLength={170} value={p.seoDescription} onChange={(e) => setP({ ...p, seoDescription: e.target.value })} />)}
        </div>
        <div className="flex gap-2">
          <button onClick={() => save()} disabled={busy} className={okBtn}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
          {p.status !== "published" && (
            <button onClick={() => save("published")} disabled={busy} className={darkBtn}>
              Save & publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
