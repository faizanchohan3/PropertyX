import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { COUNTRY } from "@propertyx/shared";
import { LANG_COOKIE, isLang, makeT, type Lang } from "./i18n";

/** Visitor's chosen language (cookie set by the header language switch). */
export const getLang = cache(async (): Promise<Lang> => {
  // only offer the second language this country's site supports (Urdu on the Pakistan site)
  if (COUNTRY.altLang !== "ur") return "en";
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "en";
});

export async function getT() {
  return makeT(await getLang());
}
