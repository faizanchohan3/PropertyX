"use client";

import { ErrorView } from "@/components/error-view";
import "./globals.css";

/** Last-resort boundary for errors in the root layout itself; must render its own <html>. */
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-PK">
      <body className="min-h-dvh">
        <ErrorView {...props} />
      </body>
    </html>
  );
}
