"use client";

import { createContext, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { COUNTRY } from "@propertyx/shared";
import { LANG_COOKIE, makeT, type Lang, type TFunc } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export function useT(): TFunc {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

const ALT_LABEL = { ur: { name: "اردو", title: "اردو میں دیکھیں", aria: "اردو میں دیکھیں — Switch to Urdu", font: "font-urdu text-base leading-none" }, ar: { name: "العربية", title: "عرض بالعربية", aria: "عرض بالعربية — Switch to Arabic", font: "font-arabic text-sm" } } as const;

/** Header switch between English and the site's second language (Urdu / Arabic); remembers the choice for a year. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const alt = COUNTRY.altLang;
  if (!alt) return null;
  const next: Lang = lang === alt ? "en" : alt;
  const label = ALT_LABEL[alt];
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className={`btn-ghost px-2.5 ${pending ? "opacity-60" : ""} ${className}`}
      title={next === "en" ? "View in English" : label.title}
      aria-label={next === "en" ? "View in English" : label.aria}
      lang={next}
    >
      <Languages className="h-5 w-5" />
      <span className={next === "en" ? "text-sm" : label.font}>{next === "en" ? "English" : label.name}</span>
    </button>
  );
}
