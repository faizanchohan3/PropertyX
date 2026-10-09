/**
 * Editorial seed content. Written as general guidance (not legal or financial
 * advice) and avoids quoting market statistics. Tax rates and procedures change —
 * articles point readers to the relevant authority for current figures.
 */
export interface BlogSeed {
  slug: string;
  title: string;
  category: "news" | "area_guide" | "investment" | "buying" | "selling" | "rental" | "construction";
  excerpt: string;
  tags: string[];
  image: string;
  body: string;
}

export const BLOG_POSTS: BlogSeed[] = [
  {
    slug: "verify-property-documents-pakistan",
    title: "How to Verify Property Documents Before You Buy in Pakistan",
    category: "buying",
    excerpt: "A practical checklist for checking ownership, approvals and dues before paying any token money.",
    tags: ["documents", "due diligence", "fraud prevention"],
    image: "houseExterior",
    body: `Buying property is usually the largest purchase a family makes, and most disputes start with documents that were never checked. Use this checklist **before** paying token money.

## 1. Confirm who actually owns the property

- **Registry / sale deed:** Ask for a copy of the registered sale deed and confirm the seller's name matches their CNIC.
- **Fard (record of rights):** For land in Punjab, the fard from the Punjab Land Records Authority shows the current owner and any mortgage or stay. Obtain a fresh copy yourself rather than relying on one supplied by the seller.
- **Mutation (intiqal):** Confirm that the most recent transfer was mutated in the revenue record.
- **Society transfer letter:** In housing societies (DHA, Bahria Town and others), the society's own records are what count. Verify the plot or house number and owner directly with the society's transfer office.

## 2. Check the society or scheme is approved

Check whether the scheme is approved by the relevant development authority — for example LDA in Lahore, CDA in Islamabad, RDA in Rawalpindi or the Sindh Building Control Authority in Karachi. Authorities periodically publish lists of approved and illegal schemes on their websites.

## 3. Look for dues and encumbrances

- Pending property tax, society maintenance or development charges
- Utility bills (electricity, gas, water) in the seller's name and fully paid
- Any bank mortgage — ask for the bank's no-objection certificate (NOC) if the property was financed

## 4. Meet the owner, not just the dealer

If an agent is involved, insist on meeting the registered owner in person, or verify the power of attorney (general or special) and check it is registered and still valid.

## 5. Pay through traceable channels

Use bank transfers or pay orders in the owner's name and always get a signed receipt. Avoid cash payments, especially to intermediaries.

## How Bismillah helps

Listings on Bismillah show a **verification level** from 0 to 5. Level 4 means our team has reviewed ownership documents and confirmed the location; Level 5 adds a physical inspection. Verification reduces risk but is **not** a legal title guarantee — always complete your own due diligence with a qualified lawyer.`,
  },
  {
    slug: "marla-kanal-square-feet-explained",
    title: "Marla, Kanal, Square Yards and Square Feet: Pakistan's Land Units Explained",
    category: "buying",
    excerpt: "Why a '10 marla' plot isn't always the same size, and how to compare listings fairly.",
    tags: ["units", "marla", "kanal"],
    image: "aerial",
    body: `Pakistan uses several units for land and built-up area, and the same name can mean different sizes in different places.

## The common units

| Unit | Typical size |
| --- | --- |
| 1 Marla | 225 sq ft in most modern societies (272.25 sq ft in traditional revenue records) |
| 1 Kanal | 20 Marla |
| 1 Square Yard | 9 sq ft (widely used in Karachi) |
| 1 Acre | 8 Kanal / 43,560 sq ft |

## Why marla size differs

Revenue records historically use a 272.25 sq ft marla, while most planned societies (DHA, Bahria Town, LDA schemes) define a marla as 225 sq ft. Some older areas use 250 sq ft. **Always ask for the plot dimensions** (for example 25×45 ft) — dimensions remove all ambiguity.

## Comparing prices

Because unit sizes vary, compare listings on **price per square foot**. Bismillah normalises every listing to square feet (using a 225 sq ft marla) and shows price per sq ft on each property page and in the comparison tool.

## Covered area vs plot area

A house listing usually quotes the **plot** size. The **covered area** (total built floor area) can be much larger — a double-storey house on a 10 marla plot may have 4,000+ sq ft covered. Ask for both when comparing homes.`,
  },
  {
    slug: "buying-on-installments-questions-to-ask",
    title: "Buying on Installments: 10 Questions to Ask the Developer",
    category: "investment",
    excerpt: "Installment plans make projects affordable, but the details of the plan matter as much as the price.",
    tags: ["installments", "projects", "payment plan"],
    image: "construction",
    body: `Installment plans are popular for new projects because they spread the cost over several years. Before you book, ask:

1. **Is the project approved?** Ask for the approval letter (NOC) from the relevant development authority and check it independently.
2. **Who owns the land?** Is the land owned by the developer, or held under a joint venture?
3. **What exactly is included in the price?** Development charges, parking, corner or park-facing premiums and utility connection charges are often extra.
4. **What is the full payment schedule?** Get every monthly, quarterly and balloon payment in writing. Use the Bismillah Installment Calculator to see the total payable.
5. **What happens if a payment is late?** Ask about late fees, grace periods and cancellation terms.
6. **Can I transfer or resell before possession?** Check transfer fees and whether a booking can be sold.
7. **What is the possession timeline and what if it slips?** Look for penalty clauses for developer delays.
8. **Is there an escrow account?** Some developers ring-fence buyer payments for construction.
9. **What is the construction progress today?** Visit the site. Bismillah project pages show the developer-reported construction status.
10. **What does the developer's track record look like?** Look at completed projects and reviews from verified buyers.

> Tip: Never pay booking amounts in cash to individuals. Pay the developer's company account and keep receipts.`,
  },
  {
    slug: "tenant-registration-and-rental-agreements",
    title: "Renting a Home: Rental Agreements and Tenant Registration",
    category: "rental",
    excerpt: "What every landlord and tenant should put in writing, and why police tenant registration matters.",
    tags: ["renting", "tenancy", "landlord"],
    image: "living",
    body: `A clear written agreement protects both landlord and tenant.

## What the rental agreement should cover

- Names and CNIC numbers of landlord and tenant
- Monthly rent, due date and accepted payment method
- Security deposit amount and the conditions for its return
- Agreement period (commonly 11 months) and the annual increase, if any
- Who pays utilities, maintenance and society charges
- Notice period for either party to end the tenancy
- Rules on subletting, alterations and pets

Agreements are usually written on stamp paper and signed in front of witnesses.

## Tenant registration

In Punjab and Islamabad, landlords are required to register tenants with the local police, and other provinces have similar requirements. Registration can usually be done online or at the local police station or service centre. Check the current procedure with your provincial police website.

## Using Bismillah rental tools

Landlords can record leases, generate monthly rent dues, send rent reminders and log maintenance requests in **Dashboard → Rentals**. Tenants who are invited get a tenant portal to see rent history, lease details and raise maintenance requests.`,
  },
  {
    slug: "grey-structure-vs-finishing-costs",
    title: "Grey Structure vs Finishing: Understanding House Construction Costs",
    category: "construction",
    excerpt: "How construction is usually priced in Pakistan, and what drives the difference between basic and premium finishing.",
    tags: ["construction", "cost", "grey structure"],
    image: "construction",
    body: `Construction in Pakistan is commonly quoted in two parts: **grey structure** and **finishing**.

## Grey structure

The grey structure is the skeleton of the house: excavation, foundations, columns and beams, brickwork, roof slabs, plastering and the basic electrical and plumbing conduits. Its cost depends mainly on covered area and the prevailing prices of cement, steel, bricks and sand.

## Finishing

Finishing covers everything you see and use: tiles and flooring, paint, doors and windows, kitchen, bathroom fittings, electrical fixtures, false ceilings and woodwork. Finishing quality varies enormously — the same house can cost very different amounts depending on materials chosen.

## What drives cost

- **Covered area:** cost scales almost linearly with square feet built
- **Floors and basements:** basements require extra excavation, retaining walls and waterproofing
- **Finishing quality:** imported fittings and premium stone add significantly
- **Labour arrangement:** "labour-only" contracts vs "with material" contracts
- **City:** material transport and labour rates vary between cities

## Estimate your project

The Bismillah **Construction Cost Calculator** breaks an estimate into grey structure, finishing, electrical, plumbing, woodwork, kitchen, bathrooms and labour using rates maintained by our team. Treat it as a planning estimate and get detailed quotes from contractors before you start.`,
  },
  {
    slug: "selling-your-property-checklist",
    title: "Selling Your Property: A Checklist for a Faster, Safer Sale",
    category: "selling",
    excerpt: "Prepare your documents, price realistically and create a listing that attracts serious buyers.",
    tags: ["selling", "listing tips"],
    image: "houseExterior",
    body: `## Before you list

- Gather your documents: registry or transfer letter, approved building plan, completion certificate (if available), latest utility bills and tax receipts.
- Clear any outstanding society dues.
- Fix small repairs — leaking taps, broken tiles and peeling paint make buyers negotiate harder.

## Price it realistically

Look at comparable listings in your block or sector and compare **price per square foot**, not just total price. The Bismillah **"What's My Property Worth?"** tool gives an indicative range based on comparable listings.

## Create a strong listing

- **Photos:** shoot in daylight, include every room, the exterior and the street.
- **Details:** plot and covered area, bedrooms, bathrooms, year built, gas/electricity status, corner or park-facing.
- **Honest description:** buyers trust listings that mention limitations upfront.
- Use **AI Assist** in the listing wizard to draft a title and description, then edit it in your own words.

## Get verified

Verified listings earn a badge that buyers look for. Submit your documents privately in **Dashboard → Verification** — documents are only visible to our verification team.

## Handling buyers

Use in-app messaging and visit scheduling so you have a record of every enquiry. Meet buyers at the property during daylight, and never hand over original documents before payment is completed through a traceable channel.`,
  },
  {
    slug: "rental-yield-vs-capital-gains",
    title: "Rental Yield vs Capital Gains: Two Ways Property Makes Money",
    category: "investment",
    excerpt: "How to think about income and appreciation when you evaluate an investment property.",
    tags: ["investment", "rental yield", "ROI"],
    image: "apartmentBuilding",
    body: `Property returns come from two sources: **rental income** and **capital appreciation**.

## Rental yield

Gross rental yield = annual rent ÷ purchase price × 100. Net yield subtracts vacancy, maintenance, taxes and management costs. Apartments and smaller homes in central areas often deliver higher yields than large houses or plots, which may earn little or no rent.

## Capital appreciation

Appreciation is the increase in value over time. It depends on the area's development, infrastructure, supply and broader economic conditions — and it can be negative. Plots in developing societies are often bought for appreciation but carry delivery and liquidity risk.

## Putting them together

Total return = net rental income + appreciation − buying and selling costs. When financing is involved, compare returns on the **cash you actually invested**, not on the full price.

## Try it

The **Bismillah Investment Advisor** calculates yield, cash flow, ROI, total return and a break-even period, and gives an indicative score. Results are estimates based on your assumptions — they are not financial advice.`,
  },
  {
    slug: "islamic-home-financing-options",
    title: "Islamic Home Financing: Diminishing Musharakah, Ijarah and Murabaha",
    category: "buying",
    excerpt: "A plain-language introduction to the Shariah-compliant home finance structures offered by Pakistani banks.",
    tags: ["home finance", "islamic banking", "mortgage"],
    image: "living",
    body: `Most Pakistani banks offer Shariah-compliant home finance alongside conventional loans.

## Diminishing Musharakah

The bank and customer jointly own the property. The customer gradually buys the bank's share in units while paying rent on the share the bank still owns. As the bank's share shrinks, the rent component falls.

## Ijarah

The bank buys the property and leases it to the customer. Ownership transfers to the customer at the end of the lease, typically through a separate sale or gift arrangement.

## Murabaha

The bank buys the property and sells it to the customer at a disclosed profit, payable in installments. The total price is fixed at the start.

## What to compare

- The profit rate and how it is reset (often linked to KIBOR)
- Maximum financing as a percentage of value and the maximum tenure
- Processing fees, takaful (insurance) and early settlement terms

The **Bismillah Home Finance Calculator** lets you compare conventional and Islamic structures side by side. Rates shown are defaults set by our team for illustration — confirm current offers with your bank.`,
  },
  {
    slug: "propertyx-verification-levels-explained",
    title: "Bismillah Verification Levels Explained",
    category: "news",
    excerpt: "What each verification badge on Bismillah means, and how to get your listing or profile verified.",
    tags: ["platform", "verification", "trust"],
    image: "houseExterior",
    body: `Every listing and agent on Bismillah carries a verification level so buyers know how much has been checked.

| Level | Meaning |
| --- | --- |
| 0 — Unverified | No checks performed yet |
| 1 — Phone Verified | The contact number was confirmed with a one-time code |
| 2 — Identity Verified | Our team reviewed the owner's or agent's CNIC |
| 3 — Documents Submitted | Ownership documents received and awaiting review |
| 4 — Property Verified | Ownership documents reviewed and location confirmed |
| 5 — Premium Verified | A Bismillah officer physically inspected the property |

## How to get verified

1. Verify your phone number in **Account → Security**.
2. Go to **Dashboard → Verification** and upload the requested documents.
3. Our team reviews submissions and either approves them or tells you what is missing.

Documents are stored in private storage and are only visible to you and our verification staff. Verification has an expiry date so that badges stay current.

Verification reduces risk but does not replace independent legal due diligence.`,
  },
  {
    slug: "choosing-a-property-agent",
    title: "How to Choose a Property Agent You Can Trust",
    category: "buying",
    excerpt: "Signals that separate professional agents from risky intermediaries.",
    tags: ["agents", "trust"],
    image: "office",
    body: `A good agent saves time and helps you avoid mistakes. Look for:

- **A verifiable identity and office.** Verified agents on Bismillah have had their identity reviewed.
- **Local expertise.** Agents who specialise in a society know its blocks, prices and transfer process.
- **Transparency about commission.** Agree on commission in writing before viewings start.
- **Real listings.** Be wary of agents advertising prices far below the market — this is a common lure.
- **Reviews from verified interactions.** Reviews on Bismillah are moderated and marked when the reviewer had a recorded interaction with the agent.

## Red flags

- Pressure to pay token money immediately "before someone else does"
- Refusal to let you meet the owner
- Requests to pay into a personal account that doesn't match the owner's name

You can report suspicious listings or agents from any listing page using **Report**. Our trust and safety team reviews every report.`,
  },
];

export const AREA_GUIDES: Record<string, { title: string; summary: string; body: string; pros: string[]; cons: string[] }> = {
  "dha-lahore": {
    title: "Living in DHA Lahore",
    summary: "Planned phases, strong infrastructure and a wide range of home sizes, at premium prices.",
    body: "DHA Lahore is divided into numbered phases built over several decades. Older phases (1–6) are largely developed and populated, with mature commercial areas, schools and parks, while newer phases continue to see construction. Homes range from 5 marla houses to multi-kanal bungalows. The society manages its own security, maintenance and transfers, which many buyers value. Buyers should check the specific phase and block, as prices, possession status and development vary considerably across the society.",
    pros: ["Planned infrastructure and wide roads", "Society-managed security and maintenance", "Established commercial areas"],
    cons: ["Premium pricing", "Newer phases still under development", "Commute times to the old city"],
  },
  "bahria-town-lahore": {
    title: "Living in Bahria Town Lahore",
    summary: "A self-contained gated township with internal amenities and a broad range of price points.",
    body: "Bahria Town Lahore is a large gated township off Canal Road and Multan Road. Residents have access to schools, a hospital, mosques, parks and commercial areas within the township. It offers a wide range of plot and house sizes, making it popular with first-time buyers and overseas Pakistanis. As with any large society, development and occupancy vary by sector, so buyers should visit the specific sector before purchasing.",
    pros: ["Gated with internal amenities", "Many price points", "Ready houses available"],
    cons: ["Distance from central Lahore", "Variation between sectors"],
  },
  "gulberg-lahore": {
    title: "Living in Gulberg, Lahore",
    summary: "Central, established and commercial — the heart of modern Lahore.",
    body: "Gulberg sits at the centre of Lahore and is home to some of the city's main shopping, dining and office corridors including Main Boulevard and MM Alam Road. Residential streets offer large older homes and newer apartment buildings. Its central location means shorter commutes to most of the city but also busier roads.",
    pros: ["Central location", "Shopping and dining", "Office corridors nearby"],
    cons: ["Traffic congestion", "Higher prices per square foot"],
  },
  "dha-karachi": {
    title: "Living in DHA Karachi",
    summary: "Seaside living with bungalows, apartments and established commercial streets.",
    body: "DHA Karachi stretches along the coast and is divided into phases. Phases closer to Clifton are older and densely developed, while later phases offer larger plots and newer construction. The Khayaban roads and commercial areas host shops, restaurants and offices. Buyers should consider water supply arrangements and check the specific phase's development status.",
    pros: ["Coastal location", "Established commercial areas", "Range of bungalows and apartments"],
    cons: ["Premium pricing", "Water supply varies by area"],
  },
  "f-11-islamabad": {
    title: "Living in F-11, Islamabad",
    summary: "A well-developed CDA sector with family homes and apartment towers.",
    body: "F-11 is a mature CDA sector with organised sub-sectors around a central Markaz. Residents have quick access to Kashmir Highway, Margalla Road and the newer western sectors. The Markaz area has a concentration of apartment buildings, while sub-sectors are mostly family homes.",
    pros: ["Developed infrastructure", "Markaz amenities", "Good connectivity"],
    cons: ["Limited new supply", "Higher prices than outer sectors"],
  },
  "bahria-town-karachi": {
    title: "Living in Bahria Town Karachi",
    summary: "Gated precincts of villas and apartments on the M-9 corridor.",
    body: "Bahria Town Karachi is a large township on the Superhighway organised into precincts. It offers ready villas and apartments as well as plots, along with commercial areas and recreational facilities. Its distance from central Karachi means residents typically commute by car.",
    pros: ["Gated precincts", "Ready homes", "Planned amenities"],
    cons: ["Distance from city centre", "Variation in occupancy across precincts"],
  },
  "hayatabad-peshawar": {
    title: "Living in Hayatabad, Peshawar",
    summary: "Peshawar's planned township with sectored phases and parks.",
    body: "Hayatabad is a planned township developed by the Peshawar Development Authority on the western side of the city. It is divided into phases and sectors with markets, parks, hospitals and schools, making it one of Peshawar's most sought-after residential areas.",
    pros: ["Planned layout", "Parks and markets", "Hospitals nearby"],
    cons: ["Older phases have limited new supply"],
  },
  "dha-islamabad": {
    title: "Living in DHA Islamabad",
    summary: "Gated sectors along the Islamabad Expressway with a golf course.",
    body: "DHA Islamabad spans multiple phases along the GT Road and Islamabad Expressway corridor. Phase 2 is the most developed, with populated sectors, commercial areas and a golf course. Later phases are still developing. Its location gives good access to both Islamabad and Rawalpindi.",
    pros: ["Expressway access", "Gated sectors", "Golf course"],
    cons: ["Later phases still developing"],
  },
};
