"use client";

import { ErrorView } from "@/components/error-view";

export default function SiteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
