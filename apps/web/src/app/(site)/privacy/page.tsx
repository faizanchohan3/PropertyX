import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy policy" updated="October 2026">
      <p>This policy explains what information Bismillah Pakistan collects and how it is used.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details</strong> — name, email, phone number and the role you choose.</li>
        <li><strong>Listings and messages</strong> — property details, photos and documents you upload, and messages you send through the site.</li>
        <li><strong>Usage</strong> — searches, saved properties and pages viewed, used to improve results and recommendations.</li>
        <li><strong>Verification documents</strong> — kept private and used only to verify you or your property.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run the site: show listings, connect buyers with sellers, and send the alerts and notifications you ask for.</li>
        <li>To keep users safe: detect fraud, spam and fake listings.</li>
        <li>To improve search, recommendations and our AI assistant. Photo location data is removed when you upload.</li>
      </ul>
      <h2>What others can see</h2>
      <p>Your listings, and the contact details you add to them, are public. Your email, verification documents and private messages are not shown to other users.</p>
      <h2>Sharing</h2>
      <p>We don't sell your personal information. We share it only with service providers that help run the site (such as hosting, email and payments), or when required by law.</p>
      <h2>Your choices</h2>
      <p>You can edit your profile and notification settings in your <Link href="/account">account</Link>, and delete listings at any time. To close your account and remove your data, contact us from your account.</p>
      <h2>Changes</h2>
      <p>We may update this policy; the date at the top shows the latest version. See also our <Link href="/terms">terms of use</Link>.</p>
    </StaticPage>
  );
}
