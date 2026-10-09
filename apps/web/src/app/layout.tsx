import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/toast";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PK" className={jakarta.variable}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
