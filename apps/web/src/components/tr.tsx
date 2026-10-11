"use client";

import { useT } from "./i18n";

/** Translated text for components that can't take a `t` function (works in server and client trees). */
export function Tr({ k, vars }: { k: string; vars?: Record<string, string | number> }) {
  return <>{useT()(k, vars)}</>;
}
