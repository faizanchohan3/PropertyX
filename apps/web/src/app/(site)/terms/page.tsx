import { COUNTRY } from "@propertyx/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "Terms of use", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <StaticPage title="Terms of use" updated="October 2026">
      <p>These terms apply when you use {COUNTRY.brand} (“we”, “the site”). By using the site you agree to them.</p>
      <h2>What we do</h2>
      <p>We provide a platform where owners, agents, agencies and developers list property, and where buyers and tenants search and contact them. We are not a party to any sale or rental agreement, and we do not own the properties listed unless stated.</p>
      <h2>Your account</h2>
      <ul>
        <li>Give accurate information and keep your password safe. You are responsible for activity on your account.</li>
        <li>We may suspend accounts that break these terms or put other users at risk.</li>
      </ul>
      <h2>Listings</h2>
      <ul>
        <li>Only list property you own or are authorised to market, with accurate details, prices and photos.</li>
        <li>Do not post duplicate, misleading or fraudulent listings. We may edit, hide or remove listings that break these rules.</li>
      </ul>
      <h2>Prices, estimates and AI</h2>
      <p>Valuations, calculators, price indexes and AI answers are estimates based on listings on the site. They are not professional, legal or financial advice. Always verify documents and prices yourself before making a decision.</p>
      <h2>Conduct</h2>
      <p>Don't harass other users, send spam, scrape the site, or use it for anything unlawful.</p>
      <h2>Paid plans</h2>
      <p>Paid plans and featured placements are described on the <Link href="/pricing">pricing page</Link> at the time of purchase.</p>
      <h2>Liability</h2>
      <p>The site is provided “as is”. To the extent allowed by law, we are not liable for losses arising from dealings between users or from reliance on information listed by others.</p>
      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version. See also our <Link href="/privacy">privacy policy</Link>.</p>
    </StaticPage>
  );
}
