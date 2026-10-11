import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Noto_Nastaliq_Urdu } from "next/font/google";
import { Toaster } from "@/components/toast";
import { publicAppUrl } from "@propertyx/shared";
import { LangProvider } from "@/components/i18n";
import { getLang } from "@/lib/i18n-server";
import { dirFor } from "@/lib/i18n";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
// Nastaliq is the script Urdu readers expect; only downloaded when Urdu text is on the page
const urdu = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-urdu", display: "swap", preload: false });

const APP_URL = publicAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "Bismillah Pakistan — Homes, Plots & Commercial Property", template: "%s | Bismillah Pakistan" },
  description: "Search verified houses, flats, plots and commercial property for sale and rent across Pakistan. AI-powered search, price index, valuation and investment tools.",
  applicationName: "Bismillah Pakistan",
  openGraph: { type: "website", siteName: "Bismillah Pakistan", locale: "en_PK" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#047857", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang === "ur" ? "ur-PK" : "en-PK"} dir={dirFor(lang)} className={`${jakarta.variable} ${urdu.variable}`}>
      <body className="min-h-dvh">
        <LangProvider lang={lang}>
          {children}
          <Toaster />
        </LangProvider>
      </body>
    </html>
  );
}
