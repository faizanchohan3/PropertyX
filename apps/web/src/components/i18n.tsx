"use client";

import { createContext, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
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

/** Header switch between English and Urdu; remembers the choice for a year. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "ur" ? "en" : "ur";
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className={`btn-ghost px-2.5 ${pending ? "opacity-60" : ""} ${className}`}
      title={next === "ur" ? "اردو میں دیکھیں" : "View in English"}
      aria-label={next === "ur" ? "اردو میں دیکھیں — Switch to Urdu" : "View in English"}
      lang={next}
    >
      <Languages className="h-5 w-5" />
      <span className={next === "ur" ? "font-urdu text-base leading-none" : "text-sm"}>{next === "ur" ? "اردو" : "English"}</span>
    </button>
  );
}
