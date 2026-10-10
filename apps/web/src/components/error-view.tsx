"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

const RELOAD_KEY = "bismillah:chunk-reload";

/** After a new deploy, tabs opened earlier request JS chunks that no longer exist. */
function isStaleDeployError(error: Error) {
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(`${error.name} ${error.message}`);
}

/** Friendly error screen; reloads once automatically when the cause is a stale deploy. */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleDeployError(error);
  useEffect(() => {
    console.error(error);
    if (!stale) return;
    try {
      // guard against a reload loop if the chunk is genuinely missing
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - last < 10_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      /* storage blocked: still reload once */
    }
    window.location.reload();
  }, [error, stale]);

  return (
    <div className="container-px flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-2xl font-extrabold text-slate-900">{stale ? "Updating to the latest version…" : "Something went wrong"}</h1>
      <p className="mt-2 max-w-md text-slate-500">{stale ? "The site was just updated. Reloading the page." : "This page hit an unexpected problem. Please try again — if it keeps happening, reload the page."}</p>
      <div className="mt-6 flex gap-2">
        <button className="btn-primary" onClick={() => (stale ? window.location.reload() : reset())}>
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
        {/* full page load on purpose: it also picks up the latest deploy */}
        <button className="btn-outline" onClick={() => window.location.assign("/")}>
          Go to home page
        </button>
      </div>
      {error.digest && <p className="mt-6 text-xs text-slate-400">Error reference: {error.digest}</p>}
    </div>
  );
}
