import { COUNTRY, isUAE } from "@propertyx/shared";
import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = { title: "Safety tips for buying and renting", description: `How to avoid property scams in ${COUNTRY.inName}: checking documents, visiting before paying, and spotting fake listings.`, alternates: { canonical: "/safety" } };

export default function SafetyPage() {
  return (
    <StaticPage title="Safety tips" intro="Most property fraud can be avoided with a few simple checks.">
      <h2>Before you pay anything</h2>
      <ul>
        <li><strong>Never send token or advance money before visiting</strong> the property in person.</li>
        <li>Meet the owner or authorised agent, and confirm their {isUAE ? "Emirates ID or passport" : "CNIC"} matches the ownership documents.</li>
        <li>Pay through a bank transfer or pay order — avoid cash, and get a signed receipt.</li>
      </ul>
      <h2>Check the documents</h2>
      <ul>
        <li>Ask for the fard, registry or transfer letter, and verify it with the land record office or the society.</li>
        <li>For society plots, confirm the file or plot with the society office and check that the society is approved by the relevant development authority.</li>
        <li>For new projects, check the NOC and approval status before booking.</li>
        <li>Get a lawyer to review the sale agreement for large purchases.</li>
      </ul>
      <h2>Warning signs</h2>
      <ul>
        <li>A price far below similar properties in the area — compare with our <a href="/tools/property-value">valuation tool</a>.</li>
        <li>Pressure to decide or pay today, or a seller who “is abroad” and can't meet.</li>
        <li>Requests to move the conversation off the platform straight away or to pay a “booking fee” to view.</li>
      </ul>
      <h2>Renting</h2>
      <ul>
        <li>See the property and meet the landlord before paying a deposit.</li>
        <li>Sign a written tenancy agreement and register it with the police as required in your city.</li>
      </ul>
      <h2>Report it</h2>
      <p>If something feels wrong, press <strong>Report</strong> on the listing or conversation. Our team reviews every report and removes fraudulent listings.</p>
    </StaticPage>
  );
}
