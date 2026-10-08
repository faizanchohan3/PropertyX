"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / save as PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-outline">
      <Printer className="h-4 w-4" /> {label}
    </button>
  );
}
